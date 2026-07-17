import fs from 'fs';
let text = fs.readFileSync('src/components/EmployeeBooking.tsx', 'utf8');

text = text.replace(/        <\/div>\n      \)\}\n\n      \{\/\* Create New Room Modal \*\/\}/g, "        </div>\n        </div>\n      )}\n\n      {/* Create New Room Modal */}");

fs.writeFileSync('src/components/EmployeeBooking.tsx', text);
