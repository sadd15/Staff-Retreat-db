import fs from 'fs';
let text = fs.readFileSync('src/components/ResortMap.tsx', 'utf8');

// 1. Remove createPortal import
text = text.replace("import { createPortal } from 'react-dom';\n", "");
text = text.replace("import { createPortal } from 'react-dom';", "");

// 2. We need to grab the Detail Modal code and move it into the map-container.
const modalStart = text.indexOf("{/* Detail Modal */}");
const modalEndStr = "เข้าใจแล้ว\n                </button>\n              </div>\n            </div>\n          </div>,\n          document.body\n        )}";

const modalEnd = text.indexOf(modalEndStr) + modalEndStr.length;

if (modalStart > -1 && modalEnd > -1) {
  let modalText = text.substring(modalStart, modalEnd);
  
  // Clean up modalText to remove createPortal and document.body
  modalText = modalText.replace("{selectedRoom && typeof document !== 'undefined' && createPortal(", "{selectedRoom && (");
  modalText = modalText.replace(",\n          document.body\n        )}", "\n        )}");
  
  // Replace fixed with absolute, keep inside container
  modalText = modalText.replace("fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999]", "absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50");
  
  // Let's also adjust the inner max-h so it definitely fits inside the absolute container (the map).
  // The map has an image that dictates its height. The modal should fill it or scroll within it.
  modalText = modalText.replace("max-h-[90vh] sm:max-h-[85vh]", "max-h-[90%] sm:max-h-[90%]");
  
  // 3. Remove the modal from its current location
  text = text.replace(text.substring(modalStart, modalEnd), "");
  
  // 4. Insert it back right before the map-container closing div.
  // We need to find the closing div of map-container.
  // Currently the code around line 357 is:
  //         )}
  //       </div>
  //       
  //       {isAdmin && (
  
  text = text.replace("      </div>\n      \n\n      {isAdmin && (", "        " + modalText + "\n      </div>\n      \n      {isAdmin && (");
  text = text.replace("      </div>\n      \n      {isAdmin && (", "        " + modalText + "\n      </div>\n      \n      {isAdmin && (");
  
  fs.writeFileSync('src/components/ResortMap.tsx', text);
  console.log("Modal moved successfully!");
} else {
  console.log("Could not find modal markers", { modalStart, modalEnd });
}
