import fs from 'fs';
let text = fs.readFileSync('src/components/EmployeeBooking.tsx', 'utf8');

text = text.replace(/            <\/div>\n          \)\}\n            <\/div>\n          <\/div>\n        <\/div>\n      <\/div>\n      <\/div>\n      \{\/\* Create New Room Modal \*\/\}/g,
`            </div>
          )}
        </div>
      </div>
      {/* Create New Room Modal */}`);

fs.writeFileSync('src/components/EmployeeBooking.tsx', text);
