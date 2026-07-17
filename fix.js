import fs from 'fs';
let text = fs.readFileSync('src/components/EmployeeBooking.tsx', 'utf8');

const target = `            </div>
          )}
            </div>
          </div>
      </div>

      {/* Create New Room Modal */}`;

const replacement = `            </div>
          )}
            </div>
          </div>
        </div>
      )}

      {/* Create New Room Modal */}`;

fs.writeFileSync('src/components/EmployeeBooking.tsx', text.replace(target, replacement));
