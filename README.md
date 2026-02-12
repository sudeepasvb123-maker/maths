# MathMaster - Web Application

This is a complete, responsive, and functional prototype for MathMaster tuition classes.

## Features
- **Modern Landing Page**: High-performance, animated design.
- **Student Dashboard**: 
  - Access to Live Classes, Recordings, and PDFs.
  - View Exam Marks with interactive charts.
  - Payment Gating: Content is locked if the current month is not paid.
- **Teacher Dashboard**:
  - Manage Students (Mark as Paid).
  - Add Content (Links, PDFs, Recordings).
  - Enter Marks for updates.
- **Authentication**: Secured Login/Register flow.

## How to Use (MOCK DATA)
The application uses the browser's LocalStorage to simulate a real backend. Data persists even if you refresh!

### 1. Teacher Login
- **Username**: `admin`
- **Password**: `123`
- *Use this account to approve payments and add content.*

### 2. Student Login
- **Username**: `student`
- **Password**: `123`
- *Or register a new account via the Register page.*

## Technical Details
- **Frontend**: HTML5, Vanilla JavaScript.
- **Styling**: TailwindCSS (CDN).
- **Charts**: Chart.js.
- **Icons**: Heroicons (SVG).
- **No Node.js**: Runs completely in the browser.

## Instructions
1. Open `index.html` in any modern web browser.
2. Navigate to Login.
3. Login as Admin to add data.
4. Login as Student to view data.
