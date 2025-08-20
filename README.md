# Peaceful Fields Academy - Homeschool Tracking System

A comprehensive, Missouri-compliant homeschool tracking application with offline support, real-time database synchronization, and modern web technologies.

## 🚀 Features

### Core Functionality
- **Student Management**: Add, edit, and track student information
- **Course Management**: Create and organize courses by subject
- **Hour Logging**: Track daily learning hours with location and notes
- **Portfolio Management**: Store and organize work samples
- **Compliance Reporting**: Generate Missouri-compliant annual reports
- **Transcript Generation**: Create official high school transcripts
- **Diploma Creation**: Generate printable diplomas

### Technical Features
- **Progressive Web App (PWA)**: Works offline with service worker caching
- **Real-time Database**: Neon PostgreSQL with Netlify Functions
- **Modern UI**: Responsive design with accessibility features
- **Data Validation**: Comprehensive input validation and error handling
- **Backup & Restore**: Import/export functionality for data portability
- **Admin Panel**: Database monitoring and management interface

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Netlify Functions (Node.js)
- **Database**: Neon PostgreSQL
- **ORM**: Drizzle ORM
- **Deployment**: Netlify
- **Caching**: Service Worker with multiple strategies
- **Icons**: Custom SVG and PNG icons

## 📋 Requirements

- Node.js 18.0.0 or higher
- Netlify account
- Neon PostgreSQL database

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/fivegoerings/peaceful-academy.git
cd peaceful-academy
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
NETLIFY_DATABASE_URL=your_neon_database_url_here
```

### 4. Database Setup
```bash
# Generate database migrations
npm run db:generate

# Apply migrations
npm run db:migrate
```

### 5. Local Development
```bash
# Start development server
npm run dev

# Or start with functions
npm run functions:dev
```

### 6. Deploy to Netlify
```bash
# Deploy to production
npm run deploy
```

## 📁 Project Structure

```
peacefulFieldsAcademy/
├── admin/                 # Admin panel interface
│   ├── app.js            # Admin JavaScript
│   ├── index.html        # Admin HTML
│   └── style.css         # Admin styles
├── assets/               # Static assets
│   ├── icon-*.png        # App icons
│   └── icon.svg          # Main icon
├── db/                   # Database configuration
│   ├── index.ts          # Database connection
│   └── schema.ts         # Drizzle schema
├── netlify/
│   └── functions/        # Netlify serverless functions
│       ├── api.mjs       # API endpoints
│       └── db.mjs        # Database operations
├── index.html            # Main application
├── manifest.webmanifest  # PWA manifest
├── sw.js                 # Service worker
├── package.json          # Dependencies and scripts
├── netlify.toml          # Netlify configuration
└── drizzle.config.ts     # Drizzle configuration
```

## 🔧 Configuration

### Database Schema
The application uses a comprehensive database schema with the following tables:
- `students`: Student information and demographics
- `courses`: Course definitions and subjects
- `logs`: Daily hour tracking entries
- `portfolio`: Work samples and file metadata
- `files`: File storage metadata
- `settings`: Application configuration

### Environment Variables
- `NETLIFY_DATABASE_URL`: Neon PostgreSQL connection string

## 🎯 Key Improvements Made

### 1. **Database Consistency**
- Unified schema across all functions
- Proper foreign key relationships
- Comprehensive data validation
- TypeScript types for all database operations

### 2. **Error Handling & Validation**
- Input validation on all forms
- Comprehensive error messages
- Graceful error recovery
- User-friendly notifications

### 3. **Security Enhancements**
- SQL injection prevention
- Input sanitization
- CORS configuration
- Environment variable validation

### 4. **User Experience**
- Loading states and feedback
- Toast notifications
- Responsive design
- Accessibility improvements
- Keyboard navigation support

### 5. **Performance & Reliability**
- Service worker with multiple caching strategies
- Offline functionality
- Background sync capabilities
- Memory leak prevention

### 6. **Code Quality**
- Consistent coding standards
- TypeScript integration
- Modular architecture
- Comprehensive documentation

## 📊 Missouri Compliance

The application is designed to meet Missouri homeschool requirements:

- **1,000 Total Hours**: Track total learning hours per student
- **600 Core Hours**: Reading, Language Arts, Mathematics, Science, Social Studies
- **400 Core @ Home**: Core subjects completed at home
- **Documentation**: Daily logs, portfolio samples, and evaluations
- **Reporting**: Annual compliance reports and transcripts

## 🔍 Admin Panel

Access the admin panel at `/admin` to:
- Monitor database health and performance
- View real-time statistics
- Manage students, courses, and logs
- Monitor API endpoints

## 📱 PWA Features

- **Offline Support**: Works without internet connection
- **App Installation**: Install as native app
- **Background Sync**: Sync data when connection restored
- **Push Notifications**: Real-time updates
- **Responsive Design**: Works on all devices

## 🚨 Error Handling

The application includes comprehensive error handling:
- Network connectivity issues
- Database connection problems
- Invalid user input
- File upload errors
- Service worker failures

## 🔧 Development Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run deploy           # Deploy to Netlify
npm run functions:dev    # Start functions locally
npm run functions:build  # Build functions
npm run db:generate      # Generate database migrations
npm run db:migrate       # Apply migrations
npm run db:studio        # Open Drizzle Studio
npm run generate-icons   # Generate app icons
```

## 🧪 Testing

```bash
npm test                 # Run tests (when implemented)
```

## 📈 Monitoring

- Database health monitoring
- API endpoint status
- Error tracking and logging
- Performance metrics
- User activity analytics

## 🔒 Security Considerations

- All database queries use parameterized statements
- Input validation on all endpoints
- CORS properly configured
- Environment variables for sensitive data
- Regular security updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the admin panel for system status

## 🔄 Changelog

### Version 2.0.0 (Current)
- Complete database schema overhaul
- Enhanced error handling and validation
- Improved user experience and accessibility
- Service worker improvements
- Admin panel enhancements
- Security improvements
- Performance optimizations

### Version 1.0.0 (Previous)
- Initial release
- Basic functionality
- Simple database schema

---

**Peaceful Fields Academy** - Empowering homeschool families with modern, compliant tracking tools.
