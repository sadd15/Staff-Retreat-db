import express from "express";
import { google } from 'googleapis';

const app = express();
app.use(express.json());

// API routes
app.get("/api/fetch-sheet", async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const url = req.query.url as string;
  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }
  try {
    const response = await fetch(url, {
      headers: {
        'pragma': 'no-cache',
        'cache-control': 'no-cache'
      }
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch sheet" });
    }
    const text = await response.text();
    res.send(text);
  } catch (error) {
    console.error("Error fetching sheet:", error);
    res.status(500).json({ error: "Failed to fetch sheet" });
  }
});

app.post("/api/sheets/write", async (req, res) => {
  const { spreadsheetId, employees, rooms } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ 
      error: "Missing authorization header. Please ensure you are logged in."
    });
  }

  if (!spreadsheetId) {
    return res.status(400).json({ error: "Missing Spreadsheet ID" });
  }

  const token = authHeader.replace('Bearer ', '');
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // 0. Ensure target sheets exist
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
    
    const targetTabs = ['Booking_Results_Employees', 'Booking_Results_Rooms'];
    const requests = [];

    for (const tabName of targetTabs) {
      if (!existingSheets.includes(tabName)) {
        requests.push({
          addSheet: {
            properties: { title: tabName }
          }
        });
      }
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });
    }

    // 1. Update Employees sheet
    if (employees && Array.isArray(employees)) {
      const employeeData = employees.map(emp => [
        emp.id,
        emp.name,
        emp.gender,
        emp.department,
        emp.roomId || '',
        emp.rsvpStatus || 'ยังไม่ระบุ'
      ]);
      
      // Add header
      employeeData.unshift(['ID', 'Name', 'Gender', 'Department', 'RoomNumber', 'RSVPStatus']);

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'Booking_Results_Employees!A:Z',
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Booking_Results_Employees!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: employeeData,
        },
      });
    }

    // 2. Update Rooms sheet
    if (rooms && Array.isArray(rooms)) {
      const roomData = rooms.map(room => [
        room.id,
        room.roomName || '',
        room.sequence !== undefined ? room.sequence : '',
        room.roomType,
        room.capacity,
        room.genderRestriction,
        room.pricePerNight || 0,
        room.floor || 1,
        room.notes || ''
      ]);

      // Add header
      roomData.unshift(['RoomNumber', 'RoomName', 'Sequence', 'RoomType', 'Capacity', 'GenderRestriction', 'PricePerNight', 'Floor', 'Notes']);

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'Booking_Results_Rooms!A:Z',
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Booking_Results_Rooms!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: roomData,
        },
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error writing to Google Sheets:", error);
    res.status(500).json({ error: error.message || "Failed to write to sheet" });
  }
});

// For local container or non-Vercel environment
if (process.env.NODE_ENV !== "production") {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Development API server running on port ${PORT}`);
  });
}

export default app;
