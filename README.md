# Tea Time - Advanced Product Management System

A modern, responsive e-commerce platform with advanced admin dashboard for product management.

## Features

### 🛍️ Store Frontend
- Modern, responsive design with Tailwind CSS
- Real-time product display from localStorage
- Advanced search and filtering
- Product categories and pricing
- Mobile-optimized interface

### 🔧 Admin Dashboard
- Secure admin authentication
- Professional UI with advanced styling
- Full CRUD operations (Create, Read, Update, Delete)
- Real-time updates across all interfaces
- Product management with image URLs
- Form validation and error handling
- Responsive data tables with sorting/filtering
- Modal dialogs for editing

### 💾 Data Management
- Browser localStorage as primary storage
- Instant UI updates for all CRUD operations
- Data persistence across browser sessions
- Optional backend API for future database migration

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **State Management**: React Context API + useReducer
- **Storage**: Browser localStorage (simulates database)
- **Icons**: Lucide React
- **Styling**: Tailwind CSS with custom gradients
- **Optional Backend**: Node.js + Express (for future migration)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   - Store: http://localhost:5173
   - Admin: Click "Admin" button or user icon in header

## Admin Access

**Demo Credentials:**
- Email: `admin@teatime.com`
- Password: `admin123`

## Optional Backend Setup

To run the optional Express backend:

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install backend dependencies:**
   ```bash
   npm install
   ```

3. **Start the backend server:**
   ```bash
   npm run dev
   ```

4. **Backend will be available at:**
   - API: http://localhost:3001/api
   - Health check: http://localhost:3001/api/health

## Project Structure

```
src/
├── components/
│   ├── admin/           # Admin dashboard components
│   ├── store/           # Store frontend components
│   └── ui/              # Reusable UI components
├── contexts/            # React Context providers
├── api/                 # API interface layer
└── types/               # TypeScript type definitions

backend/                 # Optional Express.js API
├── server.js           # Main server file
└── package.json        # Backend dependencies
```

## Key Features Implemented

✅ **Product Management**
- Add products with image URLs
- Update existing products
- Delete products with confirmation
- Real-time UI updates

✅ **Advanced Admin UI**
- Professional dashboard design
- Secure login system
- Dynamic tables with sorting
- Modal dialogs for editing
- Form validation

✅ **Store Interface**
- Responsive product grid
- Search functionality
- Category filtering
- Modern design with hover effects

✅ **Data Persistence**
- localStorage for instant updates
- Data validation and error handling
- Cross-tab synchronization

✅ **Error Handling**
- Form validation with user feedback
- Graceful error messages
- Loading states throughout

## Future Enhancements

- Database integration (MongoDB/PostgreSQL)
- User authentication and roles
- Shopping cart functionality
- Order management
- Payment integration
- Image upload with file storage
- Advanced analytics dashboard
- Inventory management

## Development Notes

- All data is stored in browser localStorage
- Admin session persists for 24 hours
- Real-time updates across all components
- Mobile-first responsive design
- TypeScript for type safety
- Modular component architecture