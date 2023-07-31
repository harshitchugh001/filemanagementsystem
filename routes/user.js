const express = require('express');
const { pool } = require('../server').pool;
const AWS = require('aws-sdk');

const router = express.Router();


AWS.config.update({
  accessKeyId: 'YOUR_AWS_ACCESS_KEY',
  secretAccessKey: 'YOUR_AWS_SECRET_ACCESS_KEY',
  region: 'YOUR_AWS_REGION',
});

const s3 = new AWS.S3();


const createTableIfNotExists = async () => {
  try {
    const checkTableQuery = 'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)';
    const checkTableValues = ['user_folders'];
    const result = await pool.query(checkTableQuery, checkTableValues);

    if (!result.rows[0].exists) {
      
      const createTableQuery = `
        CREATE TABLE user_folders (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          email VARCHAR(255) NOT NULL,
          folder_name VARCHAR(255) NOT NULL
        )
      `;
      await pool.query(createTableQuery);
      console.log('user_folders table created successfully.');
    }
  } catch (err) {
    console.error('Error checking or creating user_folders table:', err);
  }
};

createTableIfNotExists();


router.post('/createfolder', async (req, res) => {
  const { userID, email, folderName } = req.body;

  if (!userID || !email || !folderName) {
    return res.status(400).json({ error: 'User ID, email, and folder name are required' });
  }

  const uniqueFolderName = `${userID}-${folderName}`;

  try {
    const s3ObjectParams = {
      Bucket: 'your_s3_bucket_name',
      Key: uniqueFolderName,
    };

    const s3ObjectHead = await s3.headObject(s3ObjectParams).promise();

    if (s3ObjectHead) {
      return res.status(409).json({ error: 'Folder name already exists' });
    }
    await s3.putObject(s3ObjectParams).promise();

    const insertFolderQuery = `
      INSERT INTO user_folders (user_id, email, folder_name)
      VALUES ($1, $2, $3)
    `;
    const insertFolderValues = [userID, email, uniqueFolderName];

    await pool.query(insertFolderQuery, insertFolderValues);

    res.status(201).json({
      message: 'Folder created successfully!',
      folderName: uniqueFolderName,
    });
  } catch (err) {
    console.error('Error creating folder:', err);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

module.exports = router;
