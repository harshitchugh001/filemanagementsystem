const express = require('express');
const { pool } = require('../server').pool;
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

const router = express.Router();


AWS.config.update({
  accessKeyId: 'YOUR_AWS_ACCESS_KEY',
  secretAccessKey: 'YOUR_AWS_SECRET_ACCESS_KEY',
  region: 'YOUR_AWS_REGION',
});


const s3 = new AWS.S3();

const upload = multer({
    storage: multerS3({
      s3: s3,
      bucket: 'your_s3_bucket_name',
      acl: 'private', 
      key: (req, file, cb) => {
        const userId = req.body.userID;
        const email = req.body.email;
        const uniqueFilename = `${userId}/${uuidv4()}-${file.originalname}`;
        cb(null, uniqueFilename);
      },
    }),
  });


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



router.post('/createsubfolder', async (req, res) => {
    const { userID, email, parentFolderName, subfolderName } = req.body;
  
    if (!userID || !email || !parentFolderName || !subfolderName) {
      return res.status(400).json({ error: 'User ID, email, parent folder name, and subfolder name are required' });
    }
  
    const uniqueSubfolderName = `${userID}-${parentFolderName}-${subfolderName}`;
  
    try {
     
      const parentFolderQuery = `
        SELECT *
        FROM user_folders
        WHERE user_id = $1 AND email = $2 AND folder_name = $3
      `;
      const parentFolderValues = [userID, email, parentFolderName];
  
      const parentFolderResult = await pool.query(parentFolderQuery, parentFolderValues);
      const parentFolder = parentFolderResult.rows[0];
  
      if (!parentFolder) {
        return res.status(404).json({ error: 'Parent folder not found' });
      }
  
      
      if (parentFolder.user_id !== userID) {
        return res.status(403).json({ error: 'You do not have permission to create subfolders in this folder' });
      }
  
      
      const s3ObjectParams = {
        Bucket: 'your_s3_bucket_name',
        Key: uniqueSubfolderName,
      };
  
      const s3ObjectHead = await s3.headObject(s3ObjectParams).promise();
  
      if (s3ObjectHead) {
        return res.status(409).json({ error: 'Subfolder name already exists in the parent folder' });
      }
  
      
      await s3.putObject(s3ObjectParams).promise();
  
      
      const insertSubfolderQuery = `
        INSERT INTO user_folders (user_id, email, folder_name)
        VALUES ($1, $2, $3)
      `;
      const insertSubfolderValues = [userID, email, uniqueSubfolderName];
  
      await pool.query(insertSubfolderQuery, insertSubfolderValues);
  
      res.status(201).json({
        message: 'Subfolder created successfully!',
        subfolderName: uniqueSubfolderName,
      });
    } catch (err) {
      console.error('Error creating subfolder:', err);
      res.status(500).json({ error: 'Failed to create subfolder' });
    }
  });



  router.post('/upload', upload.single('file'), async (req, res) => {
    const { userID, email } = req.body;
    const file = req.file;
  
    if (!userID || !email || !file) {
      return res.status(400).json({ error: 'User ID, email, and file are required' });
    }
  
    try {
      
      const insertFileQuery = `
        INSERT INTO uploaded_files (user_id, email, file_name, file_size)
        VALUES ($1, $2, $3, $4)
      `;
      const insertFileValues = [userID, email, file.originalname, file.size];
  
      await pool.query(insertFileQuery, insertFileValues);
  
      res.status(201).json({
        message: 'File uploaded successfully!',
        fileUrl: file.location, 
      });
    } catch (err) {
      console.error('Error uploading file:', err);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });



  router.put('/renamefile', async (req, res) => {
    const { userID, email, fileID, newFileName } = req.body;
  
    if (!userID || !email || !fileID || !newFileName) {
      return res.status(400).json({ error: 'User ID, email, file ID, and new file name are required' });
    }
  
    try {
     
      const fileQuery = `
        SELECT *
        FROM uploaded_files
        WHERE id = $1 AND user_id = $2 AND email = $3
      `;
      const fileValues = [fileID, userID, email];
  
      const fileResult = await pool.query(fileQuery, fileValues);
      const file = fileResult.rows[0];
  
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
  
      
      const s3ObjectParams = {
        Bucket: 'your_s3_bucket_name',
        Key: `${userID}/${file.id}-${newFileName}`,
        CopySource: `${'your_s3_bucket_name'}/${file.key}`, // The old S3 object key
      };
  
      await s3.copyObject(s3ObjectParams).promise();
  
     
      await s3.deleteObject({
        Bucket: 'your_s3_bucket_name',
        Key: file.key,
      }).promise();
  
      
      const updateFileNameQuery = `
        UPDATE uploaded_files
        SET file_name = $1
        WHERE id = $2
      `;
      const updateFileNameValues = [newFileName, fileID];
  
      await pool.query(updateFileNameQuery, updateFileNameValues);
  
      res.status(200).json({
        message: 'File renamed successfully!',
        newFileName: `${userID}/${file.id}-${newFileName}`,
      });
    } catch (err) {
      console.error('Error renaming file:', err);
      res.status(500).json({ error: 'Failed to rename file' });
    }
  });

  
  router.put('/movefile', async (req, res) => {
    const { userID, email, fileID, newFolderName } = req.body;
  
    if (!userID || !email || !fileID || !newFolderName) {
      return res.status(400).json({ error: 'User ID, email, file ID, and new folder name are required' });
    }
  
    try {
      
      const fileQuery = `
        SELECT *
        FROM uploaded_files
        WHERE id = $1 AND user_id = $2 AND email = $3
      `;
      const fileValues = [fileID, userID, email];
  
      const fileResult = await pool.query(fileQuery, fileValues);
      const file = fileResult.rows[0];
  
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
  
     
      const s3ObjectParams = {
        Bucket: 'your_s3_bucket_name',
        CopySource: `${'your_s3_bucket_name'}/${file.key}`,
        Key: `${userID}/${newFolderName}/${file.id}-${file.file_name}`,
      };
  
      await s3.copyObject(s3ObjectParams).promise();
  
      
      await s3.deleteObject({
        Bucket: 'your_s3_bucket_name',
        Key: file.key,
      }).promise();
  
      
      const updateFolderNameQuery = `
        UPDATE uploaded_files
        SET file_name = $1
        WHERE id = $2
      `;
      const updateFolderNameValues = [newFolderName, fileID];
  
      await pool.query(updateFolderNameQuery, updateFolderNameValues);
  
      res.status(200).json({
        message: 'File moved successfully!',
        newFolderPath: `${userID}/${newFolderName}`,
      });
    } catch (err) {
      console.error('Error moving file:', err);
      res.status(500).json({ error: 'Failed to move file' });
    }
  });

  

  router.delete('/deletefile', async (req, res) => {
    const { userID, email, fileID } = req.body;
  
    if (!userID || !email || !fileID) {
      return res.status(400).json({ error: 'User ID, email, and file ID are required' });
    }
  
    try {
      
      const fileQuery = `
        SELECT *
        FROM uploaded_files
        WHERE id = $1 AND user_id = $2 AND email = $3
      `;
      const fileValues = [fileID, userID, email];
  
      const fileResult = await pool.query(fileQuery, fileValues);
      const file = fileResult.rows[0];
  
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
  
      
      await s3.deleteObject({
        Bucket: 'your_s3_bucket_name',
        Key: file.key,
      }).promise();
  
      const deleteFileQuery = `
        DELETE FROM uploaded_files
        WHERE id = $1
      `;
      const deleteFileValues = [fileID];
  
      await pool.query(deleteFileQuery, deleteFileValues);
  
      res.status(200).json({ message: 'File deleted successfully!' });
    } catch (err) {
      console.error('Error deleting file:', err);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });
  
  

module.exports = router;
