# Data Import Guide

## Overview
The Peaceful Academy application supports importing data from JSON backup files. This guide explains how to use the import functionality and what file formats are supported.

## Import Options

### 1. Import ALL Data (Complete Backup)
This option imports all data including students, courses, logs, portfolio items, and settings.

**Location**: Settings & Backups section
**Button**: "Import ALL"

**File Format**: Complete backup JSON file with the following structure:
```json
{
  "settings": {
    "name": "School Name",
    "phone": "Phone Number",
    "address": "Address",
    "yearStart": "07-01"
  },
  "students": [
    {
      "name": "Student Name",
      "dob": "YYYY-MM-DD",
      "grade": "Grade Level",
      "startYear": 2023,
      "notes": "Optional notes"
    }
  ],
  "courses": [
    {
      "title": "Course Title",
      "subject": "Subject",
      "description": "Course description"
    }
  ],
  "logs": [
    {
      "studentId": 1,
      "courseId": 1,
      "date": "YYYY-MM-DD",
      "hours": 2.5,
      "location": "Location",
      "notes": "Optional notes"
    }
  ],
  "portfolio": [
    {
      "studentId": 1,
      "courseId": 1,
      "date": "YYYY-MM-DD",
      "title": "Portfolio Title",
      "desc": "Description",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

### 2. Import Logs Only
This option imports only log entries.

**Location**: Logs section
**Button**: "Import JSON"

**File Format**: Logs-only JSON file with the following structure:
```json
{
  "logs": [
    {
      "studentId": 1,
      "courseId": 1,
      "date": "YYYY-MM-DD",
      "hours": 2.5,
      "location": "Location",
      "notes": "Optional notes"
    }
  ]
}
```

## How to Import

1. **Prepare your backup file**: Ensure your JSON file follows the correct format
2. **Navigate to the appropriate section**:
   - For complete backup: Go to Settings & Backups
   - For logs only: Go to Logs section
3. **Click the import button**: This will open a file picker
4. **Select your JSON file**: Choose the file you want to import
5. **Confirm the import**: You'll be asked to confirm that existing data will be replaced
6. **Wait for completion**: The system will show a success notification when complete

## Important Notes

### Data Replacement
- **Import ALL**: Replaces ALL existing data (students, courses, logs, portfolio, settings)
- **Import Logs**: Adds new log entries to existing data (does not replace existing logs)

### Validation
The system validates imported data and will show error messages for:
- Invalid JSON format
- Missing required fields
- Incorrect data types
- Malformed data structures

### Error Handling
If an import fails:
- Check the error message for details
- Verify your JSON file format
- Ensure all required fields are present
- Try importing a smaller subset of data first

### Backup Before Import
Always create a backup before importing new data:
1. Go to Settings & Backups
2. Click "Export ALL (JSON)"
3. Save the backup file
4. Proceed with your import

## Troubleshooting

### Common Issues

1. **"Invalid file format" error**
   - Check that your file is valid JSON
   - Verify the file structure matches the expected format
   - Ensure the file isn't corrupted

2. **"Database not initialized" error**
   - Refresh the page and try again
   - Clear browser cache if the issue persists

3. **Import appears to succeed but data doesn't show**
   - Check the browser console for errors
   - Verify that the imported data has valid studentId and courseId references
   - Ensure the data format matches the expected schema

### Getting Help
If you continue to have issues:
1. Check the browser console for detailed error messages
2. Verify your JSON file with a JSON validator
3. Try importing a smaller test file first
4. Contact support with the specific error message

## Test Files
The application includes test files for verification:
- `test-backup.json`: Complete backup file for testing
- `test-logs.json`: Logs-only file for testing

Use these files to verify that the import functionality is working correctly in your environment.