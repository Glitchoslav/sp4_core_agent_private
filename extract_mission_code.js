#!/usr/bin/env node
/**
 * 🚀 MISSION CODE EXTRACTOR
 * 
 * Extracts generated code from mission JSON and creates project files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const missionFile = path.join(__dirname, 'missions/active/m_20251125_129092.json');
const outputDir = 'C:\\SP4KULT\\sp4-landing-page';

console.log('\n🔥 === MISSION CODE EXTRACTOR === 🔥\n');
console.log(`📂 Output: ${outputDir}\n`);

// Load mission
const mission = JSON.parse(fs.readFileSync(missionFile, 'utf8'));

console.log(`📝 Mission: ${mission.mission.id}`);
console.log(`🎯 Type: ${mission.mission.type}`);
console.log(`📋 Tasks: ${mission.execution.results.length}\n`);

// Create directories
const dirs = [
    'backend',
    'backend/controllers',
    'backend/models',
    'backend/routes',
    'backend/utils',
    'frontend',
    'docs'
];

dirs.forEach(dir => {
    const fullPath = path.join(outputDir, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✅ Created: ${dir}/`);
    }
});

console.log('\n📄 Extracting code from tasks...\n');

// Task 1: Database Schema
const dbSchema = mission.execution.results.find(r => r.taskId === 't1')?.output || '';
fs.writeFileSync(path.join(outputDir, 'docs/DATABASE_SCHEMA.md'), `# SP4 Landing Page - Database Schema\n\n${dbSchema}`);
console.log('✅ docs/DATABASE_SCHEMA.md');

// Task 2: Backend API
const backendCode = mission.execution.results.find(r => r.taskId === 't2')?.output || '';

// Extract code blocks from backend output
const codeBlocks = backendCode.match(/```(?:javascript|js|markdown)?\n([\s\S]*?)```/g) || [];

// app.js
const appJsMatch = backendCode.match(/```javascript\n(const express.*?app\.listen.*?)\n```/s);
if (appJsMatch) {
    fs.writeFileSync(path.join(outputDir, 'backend/app.js'), appJsMatch[1]);
    console.log('✅ backend/app.js');
}

// Sp4InfoModel.js
const sp4ModelMatch = backendCode.match(/\/\/ Sp4InfoModel\.js\n```javascript\n([\s\S]*?)```/);
if (sp4ModelMatch) {
    fs.writeFileSync(path.join(outputDir, 'backend/models/Sp4InfoModel.js'), sp4ModelMatch[1]);
    console.log('✅ backend/models/Sp4InfoModel.js');
}

// ClenoviaTymuModel.js
const teamModelMatch = backendCode.match(/\/\/ ClenoviaTymuModel\.js\n```javascript\n([\s\S]*?)```/);
if (teamModelMatch) {
    fs.writeFileSync(path.join(outputDir, 'backend/models/ClenoviaTymuModel.js'), teamModelMatch[1]);
    console.log('✅ backend/models/ClenoviaTymuModel.js');
}

// Sp4InfoController.js
const sp4ControllerMatch = backendCode.match(/\/\/ Sp4InfoController\.js\n```javascript\n([\s\S]*?)```/);
if (sp4ControllerMatch) {
    fs.writeFileSync(path.join(outputDir, 'backend/controllers/Sp4InfoController.js'), sp4ControllerMatch[1]);
    console.log('✅ backend/controllers/Sp4InfoController.js');
}

// ClenoviaTymuController.js
const teamControllerMatch = backendCode.match(/\/\/ ClenoviaTymuController\.js\n```javascript\n([\s\S]*?)```/);
if (teamControllerMatch) {
    fs.writeFileSync(path.join(outputDir, 'backend/controllers/ClenoviaTymuController.js'), teamControllerMatch[1]);
    console.log('✅ backend/controllers/ClenoviaTymuController.js');
}

// Routes
const sp4RoutesMatch = backendCode.match(/\/\/ sp4InfoRoutes\.js\n```javascript\n([\s\S]*?)```/);
if (sp4RoutesMatch) {
    fs.writeFileSync(path.join(outputDir, 'backend/routes/sp4InfoRoutes.js'), sp4RoutesMatch[1]);
    console.log('✅ backend/routes/sp4InfoRoutes.js');
}

const teamRoutesMatch = backendCode.match(/\/\/ clenoviaTymuRoutes\.js\n```javascript\n([\s\S]*?)```/);
if (teamRoutesMatch) {
    fs.writeFileSync(path.join(outputDir, 'backend/routes/clenoviaTymuRoutes.js'), teamRoutesMatch[1]);
    console.log('✅ backend/routes/clenoviaTymuRoutes.js');
}

// Full backend guide
fs.writeFileSync(path.join(outputDir, 'docs/BACKEND_SETUP.md'), `# Backend Setup\n\n${backendCode}`);
console.log('✅ docs/BACKEND_SETUP.md');

// Task 3: Frontend
const frontendCode = mission.execution.results.find(r => r.taskId === 't3')?.output || '';
fs.writeFileSync(path.join(outputDir, 'docs/FRONTEND_SETUP.md'), `# Frontend Setup (React)\n\n${frontendCode}`);
console.log('✅ docs/FRONTEND_SETUP.md');

// Task 4: API Docs
const apiDocs = mission.execution.results.find(r => r.taskId === 't4')?.output || '';
fs.writeFileSync(path.join(outputDir, 'docs/API_DOCUMENTATION.md'), `# API Documentation\n\n${apiDocs}`);
console.log('✅ docs/API_DOCUMENTATION.md');

// Task 5: Deployment (if completed)
const deployGuide = mission.execution.results.find(r => r.taskId === 't5')?.output || '';
if (deployGuide) {
    fs.writeFileSync(path.join(outputDir, 'docs/DEPLOYMENT_GUIDE.md'), `# Deployment Guide\n\n${deployGuide}`);
    console.log('✅ docs/DEPLOYMENT_GUIDE.md');
}

// Create package.json for backend
const backendPackageJson = {
    "name": "sp4-landing-backend",
    "version": "1.0.0",
    "description": "SP4 Landing Page Backend API",
    "main": "app.js",
    "type": "commonjs",
    "scripts": {
        "start": "node app.js",
        "dev": "nodemon app.js"
    },
    "dependencies": {
        "express": "^4.18.2",
        "pg": "^8.11.3",
        "sequelize": "^6.35.1",
        "cors": "^2.8.5"
    },
    "devDependencies": {
        "nodemon": "^3.0.2"
    }
};

fs.writeFileSync(
    path.join(outputDir, 'backend/package.json'),
    JSON.stringify(backendPackageJson, null, 2)
);
console.log('✅ backend/package.json');

// Create README
const readme = `# 🚀 SP4 Landing Page

**Generated by Full Autonomy v2.0** in 36 seconds for $0.20

## 📊 Mission Stats

- **Mission ID**: ${mission.mission.id}
- **Type**: ${mission.mission.type.toUpperCase()}
- **Tasks Completed**: ${mission.execution.results.length}
- **Total Cost**: $${mission.execution.totalCost}
- **Total Time**: ${mission.execution.totalTime} min
- **Created**: ${new Date(mission.mission.createdAt).toLocaleString('sk-SK')}

## 🎯 Goal

${mission.mission.goal}

## 📁 Project Structure

\`\`\`
sp4-landing-page/
├── backend/           # Node.js + Express API
│   ├── controllers/   # Request handlers
│   ├── models/        # Sequelize models
│   ├── routes/        # API routes
│   ├── utils/         # Database connector
│   ├── app.js         # Main entry point
│   └── package.json
├── frontend/          # React app (see docs/FRONTEND_SETUP.md)
└── docs/              # Documentation
    ├── DATABASE_SCHEMA.md
    ├── BACKEND_SETUP.md
    ├── FRONTEND_SETUP.md
    ├── API_DOCUMENTATION.md
    └── DEPLOYMENT_GUIDE.md
\`\`\`

## 🚀 Quick Start

### Backend
\`\`\`bash
cd backend
npm install
npm start  # Runs on http://localhost:3000
\`\`\`

### Frontend
\`\`\`bash
cd frontend
npx create-react-app .
npm install axios
npm start  # Runs on http://localhost:3001
\`\`\`

## 📖 Documentation

Check \`docs/\` folder for:
- Database schema design
- Backend implementation guide
- Frontend setup instructions
- API endpoints documentation
- Deployment guide

## 🔥 Built with SP4 Full Autonomy v2.0

**"Be real. Be free. Be BAD."**
`;

fs.writeFileSync(path.join(outputDir, 'README.md'), readme);
console.log('✅ README.md');

// Create .gitignore
const gitignore = `node_modules/
.env
*.log
.DS_Store
dist/
build/
`;

fs.writeFileSync(path.join(outputDir, '.gitignore'), gitignore);
console.log('✅ .gitignore');

console.log('\n' + '='.repeat(80));
console.log('🎉 PROJECT EXTRACTED SUCCESSFULLY!');
console.log('='.repeat(80));
console.log(`\n📂 Location: ${outputDir}`);
console.log('\n📋 Next steps:');
console.log('   1. cd C:\\SP4KULT\\sp4-landing-page\\backend');
console.log('   2. npm install');
console.log('   3. Setup PostgreSQL database (see docs/DATABASE_SCHEMA.md)');
console.log('   4. npm start');
console.log('\n🔥 SP4 landing page ready to deploy!\n');
