# Admin Panel Access Information

## Default Admin Credentials

**Email:** `admin@example.com`  
**Password:** `admin123`

## How to Access Admin Dashboard

### Option 1: Direct URL Access (Recommended)
1. Start the application (see instructions below)
2. Navigate to: `http://localhost:5173/admin-dashboard`
3. You will be redirected to login if not authenticated
4. Use the credentials above to log in

### Option 2: Through Login Page
1. Navigate to: `http://localhost:5173/login`
2. Enter the admin credentials above
3. After successful login, go to: `http://localhost:5173/admin-dashboard`

## Starting the Application

### Full Stack (Frontend + Backend)
```bash
# Using Docker (Recommended)
docker-compose up --build

# Frontend will be available at: http://localhost:5173
# Backend API will be available at: http://localhost:5000
```

### Development Mode
```bash
# Terminal 1 - Start Backend
cd server
npm install
npm run dev  # Backend runs on http://localhost:5000

# Terminal 2 - Start Frontend  
npm install
npm run dev  # Frontend runs on http://localhost:5173
```

### Admin App (Separate Admin Interface)
The repository also includes a separate Next.js admin application:

```bash
cd admin-app
npm install
npm run dev  # Admin app runs on http://localhost:3000
```

**Note:** This is a separate scaffolded admin interface that may require additional setup. The main admin functionality is available through the `/admin-dashboard` route above.

## Admin Panel Features

The admin dashboard provides access to:
- **Dashboard Overview** - Statistics and metrics
- **Products Management** - Add, edit, delete products
- **Orders Management** - View and update order status
- **User Management** - View registered users

## Verification

To verify the admin credentials work:

1. Start the application using one of the methods above
2. Navigate to `http://localhost:5173/admin-dashboard`
3. You should be redirected to the login page
4. Enter the credentials:
   - Email: `admin@example.com`
   - Password: `admin123`
5. After successful login, you should be redirected to the admin dashboard

**Note:** The backend API must be running for authentication to work properly. If using the frontend-only mode, some admin functions may be limited.

## Screenshots

### Login Page
![Login Page](https://github.com/user-attachments/assets/bad63328-3824-4fa4-8a77-1ba8f80cea28)

### Admin Credentials Filled
![Admin Credentials](https://github.com/user-attachments/assets/89515dbd-f2a9-4698-a5c2-4f8bf38d4860)

## Environment Variables

The admin credentials can be customized using environment variables:

**Frontend (.env):**
```
VITE_BACKEND_ADMIN_EMAIL=admin@example.com
VITE_BACKEND_ADMIN_PASSWORD=admin123
```

**Backend (.env):**
```
ADMIN_EMAIL=admin@example.com
```

## Creating Additional Admins

Use the provided script to create additional admin users:

```bash
cd server
npx ts-node scripts/createAdmin.ts <email> <password>
```

Example:
```bash
npx ts-node scripts/createAdmin.ts newadmin@example.com newpassword123
```

## Security Notes

⚠️ **Important:** Change the default credentials before deploying to production!

- Update the environment variables with secure credentials
- Use strong passwords
- Consider implementing additional security measures for production

## Troubleshooting

1. **Cannot access admin dashboard:** Ensure both frontend and backend are running
2. **Login fails:** Check that the backend database is connected and admin user exists
3. **Page not found:** Verify you're using the correct URL: `/admin-dashboard`
4. **Authentication issues:** Clear browser cookies and try logging in again