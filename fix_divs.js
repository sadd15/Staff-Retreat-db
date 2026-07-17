import fs from 'fs';
let text = fs.readFileSync('src/components/EmployeeBooking.tsx', 'utf8');

const endRe = /            <\/div>\n          \)\}\n            <\/div>\n          <\/div>\n        <\/div>\n        <\/div>\n      \)\}/g;
const endReplacement = `            </div>
          )}
        </div>
      </div>`;

text = text.replace(endRe, endReplacement);
fs.writeFileSync('src/components/EmployeeBooking.tsx', text);
