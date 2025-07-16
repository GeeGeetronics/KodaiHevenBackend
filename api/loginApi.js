const express = require('express');
const { sql, getPool } = require('./connection');
const app = express();
const port = process.env.PORT || 3001;
const router = express.Router();
app.use(express.json());
require('dotenv').config();

// ✅ Login API
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password)
      .query('SELECT ID, Username FROM LOGIN WHERE Username = @username AND Password = @password');

    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      res.json({ success: true, userId: user.ID, username: user.Username });
    } else {
      res.json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ Menu section
app.get('/api/menu_items', async (req, res) => {
  try {
    const db = await getPool();
    const result = await db.request().query('SELECT DISTINCT Menu_section FROM Menu_Item_Master');
    res.json(result.recordset);
  } catch (err) {
    console.error('Menu sections error:', err);
    res.status(500).json({ message: 'Error fetching options', error: err.message });
  }
});

// ✅ Menu by section adding
app.get('/api/menu_items/:section', async (req, res) => {
  const { section } = req.params;
  try {
    const db = await getPool();
    const result = await db.request()
      .input('section', sql.NVarChar, section)
      .query('SELECT Menu_Name, Menu_price, Menu_ID FROM Menu_Item_Master WHERE Menu_section = @section');
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Menu items by section error:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// ✅ Radio options
app.get('/api/radio-options', async (req, res) => {
  try {
    const db = await getPool();
    const result = await db.request().query('SELECT TYPE FROM RADIO_OPTION');
    res.json(result.recordset);
  } catch (err) {
    console.error('Radio options error:', err);
    res.status(500).json({ message: 'Error fetching options', error: err.message });
  }
});

// ✅ Table names
app.get('/api/table-names', async (req, res) => {
  try {
    const db = await getPool();
    const result = await db.request().query('SELECT Table_Name FROM Table_Master');
    res.json(result.recordset);
  } catch (err) {
    console.error('Table names error:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.post('/api/save_menu_items', async (req, res) => {
  const { menuSection, radioOption, selectedRoom, items, userId } = req.body;

  console.log('▶️ Full req.body:', req.body);
  console.log('🔄 Incoming save request payload:', {
    menuSection, radioOption, selectedRoom, userId,
    itemsLength: Array.isArray(items) ? items.length : 'invalid'
  });

  if (!menuSection || !radioOption || !selectedRoom || !Array.isArray(items) || items.length === 0 || !userId) {
    return res.status(400).json({ success: false, message: 'Invalid input' });
  }

  try {
    const db = await getPool();
    const transaction = new sql.Transaction(db);
    await transaction.begin();

    // Get new KOT Number
    const kotRequest = new sql.Request(transaction);
    const kotNoResult = await kotRequest.query('SELECT ISNULL(MAX(CAST(KOT_No AS INT)), 0) AS maxKotNo FROM KOT_NEW');
    const newKotNo = kotNoResult.recordset[0].maxKotNo + 1;

    let totalGross = 0;

    for (const item of items) {
      const request = new sql.Request(transaction);
      request.input('menuSection', sql.VarChar, menuSection);
      request.input('radioOption', sql.VarChar, radioOption);
      request.input('roomNo', sql.VarChar, selectedRoom);
      request.input('code', sql.VarChar, item.code || '');
      request.input('desc', sql.VarChar, item.desc || '');
      request.input('qty', sql.Int, item.qty || 0);
      request.input('price', sql.Decimal(10, 2), item.price || 0);
      request.input('total', sql.Decimal(10, 2), item.total || 0);
      request.input('remarks', sql.VarChar, item.remarks || '');
      request.input('kotNo', sql.Int, newKotNo);
      request.input('userId', sql.Int, userId);

      totalGross += item.total || 0;

      await request.query(`
        INSERT INTO KOT_NEW
          (Menu_Section, Radio_Option, Room_No, ItemCode, Description, Qty, Price, Total, Remarks, KOT_No, User_ID)
        VALUES
          (@menuSection, @radioOption, @roomNo, @code, @desc, @qty, @price, @total, @remarks, @kotNo, @userId)
      `);
    }

    // Now insert into Table_Order_Master
    const masterRequest = new sql.Request(transaction);
    masterRequest.input('Client_Id', sql.VarChar, 'CL1');
    masterRequest.input('Table_Code', sql.VarChar, '');
    masterRequest.input('Sale_Date', sql.DateTime, new Date());
    masterRequest.input('Sale_Type', sql.VarChar, '1');
    masterRequest.input('Sale_Table_No', sql.VarChar, selectedRoom);
    masterRequest.input('Sale_Table_Covers', sql.Int, 1);
    masterRequest.input('Sale_Captain_ID', sql.VarChar, '1');
    masterRequest.input('Sale_Amount_Gross', sql.Decimal(10, 2), totalGross);
    masterRequest.input('Sale_Amount_Exchange', sql.Decimal(10, 2), 48);
    masterRequest.input('Sale_Amount_Roundoff', sql.Decimal(10, 2), 48);
    masterRequest.input('Sale_Overall_Discount', sql.Decimal(10, 2), 0);
    masterRequest.input('Sale_Amount_Nett', sql.Decimal(10, 2), totalGross);
    masterRequest.input('Sale_Amount_Received', sql.Decimal(10, 2), totalGross);
    masterRequest.input('Sale_BillCancelled', sql.Int, 0);
    masterRequest.input('Company_Code', sql.Int, 1);
    masterRequest.input('Bill_Printed', sql.Int, 48);
    masterRequest.input('System_Number', sql.VarChar, 'S1');
    masterRequest.input('Employee_Code', sql.VarChar, '1');
    masterRequest.input('Cash_Received', sql.Decimal(10, 2), 0);
    masterRequest.input('Customer_Code', sql.Int, 1);
    masterRequest.input('Due_Date', sql.DateTime, new Date());
    masterRequest.input('Total_Sale_BaseAmount', sql.Decimal(10, 2), totalGross);
    masterRequest.input('Total_Sale_TaxAmount', sql.Decimal(10, 2), 0);
    masterRequest.input('ServiceTax_Amount', sql.Decimal(10, 2), 48);
    masterRequest.input('REMARKS', sql.VarChar, 'OK');
    masterRequest.input('SaleCustomer_Name', sql.VarChar, '');
    masterRequest.input('Customer_CellPhoneNumber', sql.VarChar, '');
    masterRequest.input('token_no', sql.VarChar, 'D');

    await masterRequest.query(`
      INSERT INTO Table_Order_Master
      (Client_Id, Table_Code, Sale_Date, Sale_Type, Sale_Table_No, Sale_Table_Covers, Sale_Captain_ID,
       Sale_Amount_Gross, Sale_Amount_Exchange, Sale_Amount_Roundoff, Sale_Overall_Discount,
       Sale_Amount_Nett, Sale_Amount_Received, Sale_BillCancelled, Company_Code, Bill_Printed,
       System_Number, Employee_Code, Cash_Received, Customer_Code, Due_Date,
       Total_Sale_BaseAmount, Total_Sale_TaxAmount, ServiceTax_Amount, REMARKS,
       SaleCustomer_Name, Customer_CellPhoneNumber, token_no)
      VALUES
      (@Client_Id, @Table_Code, @Sale_Date, @Sale_Type, @Sale_Table_No, @Sale_Table_Covers, @Sale_Captain_ID,
       @Sale_Amount_Gross, @Sale_Amount_Exchange, @Sale_Amount_Roundoff, @Sale_Overall_Discount,
       @Sale_Amount_Nett, @Sale_Amount_Received, @Sale_BillCancelled, @Company_Code, @Bill_Printed,
       @System_Number, @Employee_Code, @Cash_Received, @Customer_Code, @Due_Date,
       @Total_Sale_BaseAmount, @Total_Sale_TaxAmount, @ServiceTax_Amount, @REMARKS,
       @SaleCustomer_Name, @Customer_CellPhoneNumber, @token_no)
    `);

    await transaction.commit();

    console.log(`✅ Saved KOT No: ${newKotNo} and inserted Table_Order_Master`);
    res.json({ success: true, message: `Saved with KOT_No ${newKotNo}` });

  } catch (err) {
    console.error('❌ Error saving:', err);
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});


// ✅ Cancel KOT
app.put('/api/cancel-kot', async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, message: 'Missing ID' });
  }

  try {
    const db = await getPool();
    await db.request()
      .input('id', sql.Int, id)
      .query("UPDATE KOT_NEW SET Cancel_Status = 'Yes' WHERE ID = @id");
    res.json({ success: true });
  } catch (err) {
    console.error('Cancel KOT error:', err);
    res.status(500).json({ success: false, message: 'DB Error' });
  }
});

// ✅ KOT List
app.get('/api/kot-list', async (req, res) => {
  const { fromDate, toDate } = req.query;

  if (!fromDate || !toDate) {
    return res.status(400).json({ success: false, message: 'fromDate and toDate are required' });
  }

  try {
    const db = await getPool();
    const result = await db.request()
      .input('fromDate', sql.Date, fromDate)
      .input('toDate', sql.Date, toDate)
      .query(`
        SELECT DISTINCT KOT_No AS kotNumber
        FROM KOT_NEW
        WHERE CAST(CreatedAt AS DATE) BETWEEN @fromDate AND @toDate
        ORDER BY kotNumber DESC
      `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('KOT list fetch error:', err);
    res.status(500).json({ success: false, message: 'Database error', error: err.message });
  }
});

// ✅ KOT Details
app.get('/api/kot-list-details/:kotNumber', async (req, res) => {
  const { kotNumber } = req.params;

  try {
    const db = await getPool();
    const result = await db.request()
      .input('kotNumber', sql.Int, kotNumber)
      .query('SELECT * FROM KOT_NEW WHERE KOT_No = @kotNumber');

    if (result.recordset.length > 0) {
      res.json({ success: true, data: result.recordset });
    } else {
      res.status(404).json({ success: false, message: 'KOT not found' });
    }
  } catch (error) {
    console.error('KOT details error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ✅ KOT Details
app.post('/api/print_kot', async (req, res) => {
  try {
    const db = await getPool();
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Missing userId' });
    }

    // ✅ Get the latest KOT_No for this user
    const latestKotResult = await db.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT TOP 1 KOT_No
        FROM KOT_NEW
        WHERE User_ID = @userId
        ORDER BY CreatedAt DESC
      `);

    if (latestKotResult.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'No KOT records found for this user' });
    }

    const latestKOTNo = latestKotResult.recordset[0].KOT_No;

    // ✅ Fetch items for this KOT, skip cancelled ones
    const itemsResult = await db.request()
      .input('kotNo', sql.Int, latestKOTNo)
      .query(`
        SELECT 
          ID, KOT_No, CreatedAt, Menu_Section, Radio_Option, Room_No,
          ItemCode, Description, Qty, Price, Total, Remarks, Cancel_Status
        FROM KOT_NEW
        WHERE KOT_No = @kotNo AND Cancel_Status != 'Yes'
      `);

    return res.json({
      success: true,
      kotNo: latestKOTNo,
      items: itemsResult.recordset,
    });

  } catch (err) {
    console.error('Print KOT error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

app.post('/api/print_kot_cancel', async (req, res) => {
  const db = await getPool();
  const { kotNo } = req.body;

  if (!kotNo) {
    return res.status(400).json({ success: false, message: 'KOT_No is required' });
  }

  const itemsResult = await db.request()
    .input('kotNo', sql.Int, kotNo)
    .query(`
      SELECT ID, KOT_No, CreatedAt, Menu_Section, Radio_Option, Room_No,
             ItemCode, Description, Qty, Price, Total, Remarks, Cancel_Status
      FROM KOT_NEW
      WHERE KOT_No = @kotNo AND Cancel_Status != 'Yes'
    `);

  if (itemsResult.recordset.length === 0) {
    return res.status(404).json({ success: false, message: 'No valid items for this KOT' });
  }

  res.json({ success: true, kotNo, items: itemsResult.recordset });
});



// ✅ Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 API running on port ${port}`);
});