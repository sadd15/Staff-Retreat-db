import fs from 'fs';
let text = fs.readFileSync('src/components/EmployeeBooking.tsx', 'utf8');

text = text.replace(/      <\/div><\/div><\/div><\/div><\/div><\/div>\n      \{\/\* Create New Room Modal \*\/\}/g,
`      {/* Create New Room Modal */}`);

fs.writeFileSync('src/components/EmployeeBooking.tsx', text);
