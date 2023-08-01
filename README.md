
# File Manager System API

This is the documentation for the File Manager System API, which allows users to manage files, folders, and perform file-related operations. The API is built using Node.js and Express.js and utilizes AWS S3 for secure file storage and PostgreSQL for database management.

## Endpoints

### POST /api/register
This endpoint allows users to register by providing their name, email, password, and role. The password is securely hashed using bcrypt before storing it in the database. The role can be either 'admin' or 'user'.

### POST /api/login
Users can log in using their registered email and password. The endpoint checks the provided credentials against the hashed password stored in the database. Upon successful login, the API returns the user ID and role.

### POST /api/createfolder
Users can create a new folder by providing their userID, email, and folder name. The folder is created both in the AWS S3 bucket and the 'user_folders' table in the PostgreSQL database.

### POST /api/createsubfolder
Users can create a subfolder inside an existing folder by providing the userID, email, parent folder name, and subfolder name. The API verifies the user's permission to create subfolders in the given parent folder.

### POST /api/upload
Users can upload files to the appropriate folders in the AWS S3 bucket. The API records file metadata, including file name, size, user ownership, and upload date, in the 'uploaded_files' table in the PostgreSQL database.

### PUT /api/renamefile
Users can rename a file by providing their userID, email, fileID, and the new file name. The API updates the file name in both the AWS S3 bucket and the 'uploaded_files' table.

### PUT /api/movefile
Users can move a file to a new folder by providing their userID, email, fileID, and the new folder name. The API updates the folder path in the AWS S3 bucket and the 'uploaded_files' table.

### DELETE /api/deletefile
Users can delete a file by providing their userID, email, and fileID. The API deletes the file from both the AWS S3 bucket and the 'uploaded_files' table.

## Technologies Used

- Node.js: The backend server is built using Node.js, providing a scalable and efficient runtime environment for the API.
- Express.js: Express is used as the web application framework for building the API endpoints and handling HTTP requests.
- AWS S3: Amazon Simple Storage Service (S3) is used to securely store files uploaded by users.
- PostgreSQL: PostgreSQL is used as the relational database management system to store user information, folder structures, and file metadata.
- bcrypt: The bcrypt library is used to securely hash and compare passwords, ensuring user credentials' confidentiality.
- Multer: Multer is used as a middleware for handling file uploads to the AWS S3 bucket.
- Multer-S3: Multer-S3 is used as the storage engine for Multer, facilitating file uploads directly to AWS S3.

## Database Connection

The API connects to the PostgreSQL database using the 'pg' library and the provided connection details in the 'pool' object.

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  user: 'your_database_user',
  host: 'your_database_host',
  database: 'your_database_name',
  password: 'your_database_password',
  port: 5432, 
});

module.exports.pool = pool;
```

## AWS Access Credentials

The API accesses the AWS S3 service using AWS access credentials (access key ID and secret access key). Make sure to replace 'YOUR_AWS_ACCESS_KEY', 'YOUR_AWS_SECRET_ACCESS_KEY', and 'YOUR_AWS_REGION' with your AWS credentials and preferred region in the 'AWS.config.update()' method.

```javascript
AWS.config.update({
  accessKeyId: 'YOUR_AWS_ACCESS_KEY',
  secretAccessKey: 'YOUR_AWS_SECRET_ACCESS_KEY',
  region: 'YOUR_AWS_REGION',
});
```

## Installing PostgreSQL and Setting Up AWS S3

To install PostgreSQL on Ubuntu, you can use the following commands:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

After installing PostgreSQL, create a database, a user, and a table for your application. You can use the 'psql' command-line utility to access PostgreSQL and execute SQL commands.

For setting up AWS S3, you need to create an AWS account if you haven't already. Then, navigate to the AWS Management Console and create an S3 bucket. After creating the bucket, you will get the access key ID and secret access key from the AWS IAM console. These credentials should be used in the 'AWS.config.update()' method as mentioned earlier.

Please remember to handle your AWS credentials securely and avoid exposing them publicly in your code or version control.

Note: Replace 'your_s3_bucket_name' in the code snippets with the actual name of your S3 bucket.

---
