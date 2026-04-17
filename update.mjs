import fs from 'fs';

const appPath = 'd:/tutor_website/student-hub-pro/src/App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

const replacement = fs.readFileSync('replacement.txt', 'utf8');

let startIdx = content.indexOf('  return (\n    <div className="flex h-[calc(100vh-140px)]');
if (startIdx === -1) {
  startIdx = content.lastIndexOf('  return (');
}

let newContent = content.substring(0, startIdx) + replacement + '\n};\n';

fs.writeFileSync(appPath, newContent);
console.log('done!');
