# Quick setup for Firebase (local dev)


1. Create a Firebase project and Firestore collection named `products`.

1. Add your Firebase config to a `.env` file at project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```


1. Install dependencies and run dev server:

```powershell
npm install
npm run dev
```


1. Admin UI is available at `/admin-dashboard` (protected - use configured admin login).

Notes:

- Components `AdminProductManager` and `LiveProductList` demonstrate Firestore add/update/delete and real-time listing.
- Ensure Firestore rules allow reads/writes for your testing scenario (or use authenticated users).
