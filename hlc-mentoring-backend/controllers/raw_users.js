app.get('/api/users/init-data', async (req, res) => {
  try {
    if (authConfig.isProduction) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy endpoint' });
    }
    if (!authConfig.defaultUserPassword) {
      return res.status(503).json({ success: false, message: 'DEFAULT_USER_PASSWORD chưa được cấu hình cho dữ liệu mẫu' });
    }
    const count = await User.countDocuments();
    if (count === 0) {
      await User.insertMany([
        { userId: 'MN01', fullName: 'Dương Văn Ninh', role: 'MENTOR', passwordHash: await bcrypt.hash(authConfig.defaultUserPassword, 12) },
        { userId: 'MN02', fullName: 'Trần Quỳnh Trang', role: 'MENTOR', passwordHash: await bcrypt.hash(authConfig.defaultUserPassword, 12) },
        { userId: 'MT01', fullName: 'Trần Phú Mỹ', role: 'MENTEE', mentorId: null, passwordHash: await bcrypt.hash(authConfig.defaultUserPassword, 12) },
        { userId: 'MT02', fullName: 'Yến Nhi', role: 'MENTEE', mentorId: null, passwordHash: await bcrypt.hash(authConfig.defaultUserPassword, 12) },
        { userId: 'MT03', fullName: 'Lê Hoàng B', role: 'MENTEE', mentorId: null, passwordHash: await bcrypt.hash(authConfig.defaultUserPassword, 12) }
      ]);
      return res.status(201).json({ success: true, message: 'Đã khởi tạo dữ liệu mẫu thành công!' });
    }
    res.status(200).json({ success: true, message: 'Dữ liệu đã tồn tại, không tạo thêm.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.get('/api/users/mentors', async (req, res) => {
  const includeInactive = req.user.role === 'ADMIN' && req.query.includeInactive === 'true';
  const filter = includeInactive
    ? { role: 'MENTOR' }
    : mentorUserFilter;
  const projection = includeInactive
    ? 'userId fullName isActive phone profileUrl email bankAccount bankName dateOfBirth livingAllowanceType joinedAt allowanceStartDate team position'
    : 'userId fullName isActive profileUrl';
  const mentors = await User.find(filter).select(projection);
  res.json({ success: true, data: mentors });
});

app.get('/api/users/mentees', async (req, res) => {
  const includeInactive = req.user.role === 'ADMIN' && req.query.includeInactive === 'true';
  const filter = includeInactive
    ? { role: 'MENTEE' }
    : { role: 'MENTEE', isActive: ACTIVE_USER_QUERY };
  const projection = includeInactive
    ? 'userId fullName isActive phone profileUrl email bankAccount bankName dateOfBirth livingAllowanceType joinedAt allowanceStartDate mentorId team position'
    : 'userId fullName mentorId isActive profileUrl';
  const mentees = await User.find(filter).select(projection);
  res.json({ success: true, data: mentees });
});

app.post('/api/users/generate-mentee-accounts', requireRole('ADMIN'), generateMenteeAccounts);

app.post('/api/users/generate-accounts', requireRole('ADMIN'), generateMenteeAccounts);

app.post('/api/users/generate-mentor-accounts', requireRole('ADMIN'), async (req, res) => {
  try {
    if (!authConfig.defaultMentorPassword) {
      return res.status(503).json({ success: false, message: 'DEFAULT_MENTOR_PASSWORD chưa được cấu hình' });
    }
    const mentors = await User.find({
      userId: /^HLC-MTO-/i
    }).select('+passwordHash userId fullName role');
    const errors = [];
    let created = 0;
    let skipped = 0;

    for (const mentor of mentors) {
      if (mentor.passwordHash) {
        skipped += 1;
        continue;
      }

      try {
        mentor.role = 'MENTOR';
        mentor.passwordHash = await bcrypt.hash(authConfig.defaultMentorPassword, 10);
        await mentor.save();
        created += 1;
      } catch (error) {
        errors.push({
          userId: mentor.userId,
          fullName: mentor.fullName,
          message: error.message || 'Không thể tạo tài khoản'
        });
      }
    }

    return res.json({
      success: true,
      data: {
        total: mentors.length,
        created,
        skipped,
        failed: errors.length,
        errors
      }
    });
  } catch (error) {
    console.error('Lỗi khởi tạo tài khoản Mentor:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể khởi tạo tài khoản Mentor'
    });
  }
});

app.get('/api/users/import-template.xlsx', requireRole('ADMIN'), (req, res) => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet([
    {
      'HLC ID (Nhập tay)': 'MT01',
      'HỌ VÀ TÊN': 'Nguyễn Văn A',
      'SĐT': '0912345678',
      EMAIL: 'a@example.com',
      'SỐ TÀI KHOẢN': '0123456789',
      'NGÂN HÀNG (Chọn list)': 'Vietcombank',
      'NGÀY SINH': '01/01/2000',
      'DIỆN HỖ TRỢ SINH HOẠT PHÍ': 'Có',
      'Trạng thái hoạt động (Chọn list)': 'Đang hoạt động',
      'THỜI GIAN GIA NHẬP HLC (Chọn ngày)': '01/09/2026',
      'THỜI GIAN BẮT ĐẦU NHẬN TRỢ CẤP (Chọn ngày)': '01/09/2026'
    }
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Users');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="hlc-users-template.xlsx"');
  res.send(buffer);
});

app.post('/api/users/import', requireRole('ADMIN'), importUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Vui lòng chọn file Excel hoặc CSV' });
    const extension = String(req.file.originalname).toLowerCase().split('.').pop();
    if (!['xlsx', 'csv'].includes(extension)) return res.status(400).json({ success: false, message: 'Chỉ hỗ trợ file .xlsx hoặc .csv' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: false });
    const errors = [];
    let imported = 0;
    let updated = 0;
    const normalizeHeader = (header) => String(header || '')
      .replace(/^\uFEFF/, '')
      .replace(/["“”]/g, '')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    const sheets = workbook.SheetNames
      .filter((name) => ['hlc mentee', 'hlc mentor'].includes(normalizeHeader(name)) || workbook.SheetNames.length === 1)
      .map((name) => ({ name, sheet: workbook.Sheets[name] }));
    if (!sheets.length) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy sheet HLC MENTEE hoặc HLC MENTOR trong file Excel'
      });
    }
    const rows = [];
    for (const { name, sheet } of sheets) {
      const rawSheet = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const headerRowIndex = rawSheet.findIndex((row) => {
        const headers = row.map(normalizeHeader);
        return headers.some((header) => header.includes('hlc id'))
          && headers.some((header) => header.includes('ho va ten'));
      });
      if (headerRowIndex < 0) {
        errors.push({ sheet: name, row: 1, message: 'Không tìm thấy dòng tiêu đề HLC ID và HỌ VÀ TÊN' });
        continue;
      }
      const headerValues = rawSheet[headerRowIndex];
      rawSheet.slice(headerRowIndex + 1).forEach((cells, offset) => {
        rows.push({
          sheet: name,
          sourceRow: headerRowIndex + offset + 2,
          data: Object.fromEntries(headerValues.map((header, columnIndex) => [
            header || `__EMPTY_${columnIndex}`,
            cells[columnIndex] === undefined ? '' : cells[columnIndex]
          ]))
        });
      });
    }
    const parseDate = (raw) => {
      if (raw === null || raw === undefined || raw === '') return null;
      if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
      if (typeof raw === 'number') {
        const parsed = XLSX.SSF.parse_date_code(raw);
        return parsed ? new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0)) : null;
      }
      const text = String(raw).trim();
      const match = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(text);
      const date = match
        ? new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])))
        : new Date(text);
      return Number.isNaN(date.getTime()) ? null : date;
    };
    const normalizePhone = (raw) => {
      if (raw === null || raw === undefined || raw === '') return '';
      let phone = String(raw).trim().replace(/[^\d+]/g, '');
      if (/^\d{9}$/.test(phone)) phone = `0${phone}`;
      if (/^\+84\d{9}$/.test(phone)) phone = `0${phone.slice(3)}`;
      return phone;
    };
    for (let index = 0; index < rows.length; index += 1) {
      const { data: row, sheet: sheetName, sourceRow } = rows[index];
      if (Object.values(row).every((item) => String(item ?? '').trim() === '')) continue;
      const normalizedRow = Object.fromEntries(
        Object.entries(row).map(([key, item]) => [normalizeHeader(key), item])
      );
      const value = (...keys) => keys
        .map((key) => normalizedRow[normalizeHeader(key)])
        .find((item) => String(item || '').trim() !== '');
      const userId = String(value(
        'HLC ID (Nhập tay)', 'HLC ID\n(Nhập tay)', 'Mã định danh', 'Mã thành viên', 'userId', 'User ID'
      ) || '').trim().replace(/\s+/g, '').toUpperCase();
      const fullName = String(value(
        'HỌ VÀ TÊN (Nhập tay)', 'HỌ VÀ TÊN\n(Nhập tay)', 'HỌ VÀ TÊN', 'Họ và tên', 'Họ tên', 'fullName', 'Full Name'
      ) || '').trim().replace(/\s+/g, ' ');
      const email = String(value('EMAIL (Nhập tay)', 'EMAIL\n(Nhập tay)', 'EMAIL', 'Email', 'email') || '')
        .replace(/\s+/g, '').toLowerCase();
      const roleValue = String(value('Vai trò', 'role', 'Role') || '').trim().toUpperCase();
      const role = ['ADMIN', 'MENTOR', 'MENTEE'].includes(roleValue)
        ? roleValue
        : (normalizeHeader(sheetName).includes('mentor') || /^MN/i.test(userId) ? 'MENTOR' : 'MENTEE');
      if (!userId || !fullName) {
        errors.push({ sheet: sheetName, row: sourceRow, message: 'Thiếu HLC ID hoặc HỌ VÀ TÊN' });
        continue;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ sheet: sheetName, row: sourceRow, message: 'Email không hợp lệ' });
        continue;
      }
      const update = {
        userId, fullName, email,
        phone: normalizePhone(value('SĐT (Nhập tay)', 'SĐT\n(Nhập tay)', 'SĐT', 'Điện thoại', 'phone')),
        bankAccount: String(value('SỐ TÀI KHOẢN (Nhập tay)', 'SỐ TÀI KHOẢN\n(Nhập tay)', 'SỐ TÀI KHOẢN', 'Số tài khoản', 'bankAccount') || '').trim(),
        bankName: String(value('NGÂN HÀNG (Chọn list)', 'NGÂN HÀNG\n(Chọn list)', 'Ngân hàng', 'bankName') || '').trim(),
        dateOfBirth: parseDate(value('NGÀY SINH', 'dob', 'Ngày sinh', 'dateOfBirth')),
        livingAllowanceType: String(value(
          'DIỆN HỖ TRỢ SINH HOẠT PHÍ (Chọn list)',
          'DIỆN HỖ TRỢ\nSINH HOẠT PHÍ\n(Chọn list)',
          'DIỆN HỖ TRỢ SINH HOẠT PHÍ',
          'Diện hỗ trợ',
          'supportType',
          'livingAllowanceType'
        ) || '').trim(),
        joinedAt: parseDate(value(
          'THỜI GIAN GIA NHẬP HLC (Chọn ngày)',
          'THỜI GIAN\nGIA NHẬP HLC\n(Chọn ngày)',
          'joinDate',
          'Thời gian gia nhập HLC',
          'joinedAt'
        )),
        allowanceStartDate: parseDate(value(
          'THỜI GIAN BẮT ĐẦU NHẬN TRỢ CẤP (Chọn ngày)',
          'THỜI GIAN\nBẮT ĐẦU NHẬN TRỢ CẤP\n(Chọn ngày)',
          'Thời gian bắt đầu nhận trợ cấp',
          'allowanceStartDate'
        )),
        role,
        mentorId: String(value('Mã mentor', 'mentorId') || '').trim().toUpperCase() || null,
        team: String(value('Team', 'team', 'Nhóm') || '').trim(),
        position: String(value('Chức vụ', 'position', 'Vị trí') || '').trim()
      };
      const activeValue = String(value('isActive') || '').trim().toLowerCase();
      if (activeValue && !['yes', 'no'].includes(activeValue)) {
        errors.push({ sheet: sheetName, row: sourceRow, message: 'isActive chỉ chấp nhận yes hoặc no' });
        continue;
      }
      if (activeValue) update.isActive = activeValue;
      const dateFields = [
        ['NGÀY SINH', 'Ngày sinh', 'dateOfBirth'],
        ['THỜI GIAN GIA NHẬP HLC (Chọn ngày)', 'Thời gian gia nhập HLC', 'joinedAt'],
        ['THỜI GIAN BẮT ĐẦU NHẬN TRỢ CẤP (Chọn ngày)', 'Thời gian bắt đầu nhận trợ cấp', 'allowanceStartDate']
      ];
      const invalidDateField = dateFields.find(([...keys]) => {
        const raw = value(...keys);
        return raw !== undefined && raw !== '' && !update[keys[keys.length - 1]];
      });
      if (invalidDateField) {
        errors.push({ sheet: sheetName, row: sourceRow, message: `Ngày không hợp lệ ở cột ${invalidDateField[0]}` });
        continue;
      }
      const password = String(value('Mật khẩu', 'password', 'Password') || '').trim();
      if (password) {
        if (Buffer.byteLength(password, 'utf8') < 8 || Buffer.byteLength(password, 'utf8') > 72) {
          errors.push({ sheet: sheetName, row: sourceRow, message: 'Mật khẩu phải dài từ 8 đến 72 byte' });
          continue;
        }
        update.passwordHash = await bcrypt.hash(password, 12);
      }
      const existing = await User.findOne({ userId });
      if (existing) {
        await User.updateOne({ _id: existing._id }, update);
        updated += 1;
      } else {
        await User.create(update);
        imported += 1;
      }
    }
    res.json({ success: true, data: { total: rows.length, imported, updated, failed: errors.length, errors } });
  } catch (error) {
    console.error('Lỗi import người dùng:', error);
    res.status(400).json({ success: false, message: error.message || 'Không thể import dữ liệu' });
  }
});

app.post('/api/users/import-mentor', requireRole('ADMIN'), importUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file Excel hoặc CSV' });
    }
    const extension = String(req.file.originalname).toLowerCase().split('.').pop();
    if (!['xlsx', 'csv'].includes(extension)) {
      return res.status(400).json({ success: false, message: 'Chỉ hỗ trợ file .xlsx hoặc .csv' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const normalizeImportHeader = (header) => String(header || '')
      .replace(/^\uFEFF/, '')
      .replace(/["“”]/g, '')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    const sheetName = workbook.SheetNames.find((name) => normalizeImportHeader(name) === 'hlc mentor');
    if (!sheetName) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy sheet HLC MENTOR trong file' });
    }
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    const headerRowIndex = rawRows.findIndex((row) => {
      const headers = row.map(normalizeImportHeader);
      return headers.some((header) => header === 'hlc id')
        && headers.some((header) => header === 'ho va ten');
    });
    if (headerRowIndex < 0) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy dòng tiêu đề HLC ID và HỌ VÀ TÊN'
      });
    }

    const headers = rawRows[headerRowIndex];
    const rows = rawRows.slice(headerRowIndex + 1).map((cells, offset) => ({
      row: headerRowIndex + offset + 2,
      data: Object.fromEntries(headers.map((header, columnIndex) => [
        header || `__EMPTY_${columnIndex}`,
        cells[columnIndex] ?? ''
      ]))
    }));
    const valueOf = (data, ...names) => {
      const normalized = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [normalizeImportHeader(key), value])
      );
      return names
        .map((name) => normalized[normalizeImportHeader(name)])
        .find((value) => String(value ?? '').trim() !== '') ?? '';
    };
    const cleanPhone = (value) => {
      let phone = String(value ?? '').trim().replace(/[^\d+]/g, '');
      if (/^\+84\d{9}$/.test(phone)) phone = `0${phone.slice(3)}`;
      if (/^84\d{9}$/.test(phone)) phone = `0${phone.slice(2)}`;
      if (/^\d{9}$/.test(phone)) phone = `0${phone}`;
      return phone;
    };
    const errors = [];
    let imported = 0;
    let updated = 0;

    for (const item of rows) {
      if (Object.values(item.data).every((value) => String(value ?? '').trim() === '')) continue;
      const userId = String(valueOf(item.data, 'HLC ID') || '').trim().replace(/\s+/g, '').toUpperCase();
      const fullName = String(valueOf(item.data, 'HỌ VÀ TÊN') || '').trim().replace(/\s+/g, ' ');
      const email = String(valueOf(item.data, 'EMAIL') || '').replace(/\s+/g, '').toLowerCase();
      if (!userId || !fullName) {
        errors.push({ row: item.row, message: 'Thiếu HLC ID hoặc HỌ VÀ TÊN' });
        continue;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ row: item.row, userId, message: 'Email không hợp lệ' });
        continue;
      }
      const update = {
        userId,
        fullName,
        phone: cleanPhone(valueOf(item.data, 'SĐT')),
        email,
        bankAccount: String(valueOf(item.data, 'SỐ TÀI KHOẢN') || '').trim(),
        bankName: String(valueOf(item.data, 'NGÂN HÀNG') || '').trim(),
        role: 'MENTOR'
      };
      const existing = await User.findOne({ userId }).select('_id passwordHash');
      if (existing) {
        await User.updateOne({ _id: existing._id }, { $set: update });
        updated += 1;
      } else {
        const newMentor = { ...update };
        if (authConfig.defaultMentorPassword) {
          newMentor.passwordHash = await bcrypt.hash(authConfig.defaultMentorPassword, 10);
        }
        await User.create(newMentor);
        imported += 1;
      }
    }

    return res.json({
      success: true,
      data: { sheet: sheetName, total: rows.length, imported, updated, failed: errors.length, errors }
    });
  } catch (error) {
    console.error('Lỗi import Mentor:', error);
    return res.status(400).json({ success: false, message: error.message || 'Không thể import dữ liệu Mentor' });
  }
});

app.patch('/api/users/mentees/:id/assign', requireRole('ADMIN'), async (req, res) => {
  try {
    const { mentorId } = req.body;
    // Tìm Mentee theo userId (VD: MT01) và cập nhật
    const updatedMentee = await User.findOneAndUpdate(
      { userId: req.params.id }, 
      { mentorId }, 
      { new: true }
    );
    res.json({ success: true, data: updatedMentee });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.post('/api/users', requireRole('ADMIN'), async (req, res) => {
  try {
    const { userId, fullName, role, password, mentorId, team, position } = req.body;
    if (!userId || !fullName || !password || !['ADMIN', 'MENTOR', 'MENTEE'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin tài khoản hợp lệ' });
    }
    if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải dài từ 8 đến 72 byte' });
    }
    const user = await User.create({
      userId: userId.trim().toUpperCase(),
      fullName,
      role,
      mentorId: mentorId || null,
      team: team || '',
      position: position || '',
      passwordHash: await bcrypt.hash(password, 12)
    });
    res.status(201).json({
      success: true,
      data: { userId: user.userId, fullName: user.fullName, role: user.role, mentorId: user.mentorId }
    });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Mã thành viên đã tồn tại' });
    console.error('Lỗi tạo tài khoản:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

app.patch('/api/users/:id/password', requireRole('ADMIN'), async (req, res) => {
  try {
    const { password } = req.body;
    if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải dài từ 8 đến 72 byte' });
    }
    const user = await User.findOneAndUpdate(
      { userId: req.params.id.toUpperCase() },
      { passwordHash: await bcrypt.hash(password, 12) },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    res.json({ success: true, message: 'Đã cập nhật mật khẩu' });
  } catch (error) {
    console.error('Lỗi cập nhật mật khẩu:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

