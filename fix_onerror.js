import fs from 'fs';
let text = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');

text = text.replace(
  'if (naturalWidth && naturalHeight) setMapRatio(naturalWidth / naturalHeight);\n          }}',
  `if (naturalWidth && naturalHeight) setMapRatio(naturalWidth / naturalHeight);
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22600%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22800%22%20height%3D%22600%22%20fill%3D%22%23cbd5e1%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22300%22%20font-size%3D%2230%22%20text-anchor%3D%22middle%22%20fill%3D%22%23475569%22%3E%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%93%E0%B8%B2%E0%B8%AD%E0%B8%B1%E0%B8%9B%E0%B9%82%E0%B8%AB%E0%B8%A5%E0%B8%94%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B9%81%E0%B8%9C%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%AA%E0%B8%B3%E0%B8%AB%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B9%82%E0%B8%8B%E0%B8%99%E0%B8%99%E0%B8%B5%E0%B9%89%3C%2Ftext%3E%3C%2Fsvg%3E';
          }}`
);
fs.writeFileSync('src/components/ResortMap.tsx', text);
console.log('Fixed onError');
