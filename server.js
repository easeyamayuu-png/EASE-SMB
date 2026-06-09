const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 🔌 データベース接続
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ease_smb';
mongoose.connect(mongoURI)
    .then(() => console.log('🍃 MongoDBに無事接続されました！'))
    .catch(err => console.error('❌ DB接続エラー:', err));

const reservationSchema = new mongoose.Schema({
    customerName: String,
    carModel: String,
    carNumber: String,
    menu: String,
    datetime: String,
    status: { type: String, default: 'pending' },
    rejectReason: { type: String, default: '' }
});
const Reservation = mongoose.model('Reservation', reservationSchema);

// 📥 API①：新規予約の受付（※これが欠落していたため追加しました）
app.post('/api/reservations', async (req, res) => {
    try {
        const newRes = new Reservation(req.body);
        await newRes.save();
        console.log('✨ 新規予約が登録されました:', newRes);
        res.status(201).json(newRes);
    } catch (e) {
        res.status(500).json({ error: '保存失敗' });
    }
});

// 🔔 API②：LINE通知（※既に定義済みですが整理しました）
app.post('/api/notify-line', async (req, res) => {
    const { id, message } = req.body;
    try {
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.LINE_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                to: process.env.LINE_USER_ID,
                messages: [{ type: 'text', text: message }]
            })
        });
        const result = await response.json();
        res.status(200).json(result);
    } catch (error) {
        console.error('LINE連携エラー:', error);
        res.status(500).json({ error: 'LINE通知失敗' });
    }
});

// 📤 API③：一覧取得
app.get('/api/reservations', async (req, res) => {
    const reservations = await Reservation.find();
    res.json(reservations);
});

// 🟢 API④：承認
app.patch('/api/reservations/:id/approve', async (req, res) => {
    const reservation = await Reservation.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    res.json(reservation);
});

// 🔴 API⑤：却下
app.patch('/api/reservations/:id/reject', async (req, res) => {
    const { rejectReason } = req.body;
    const reservation = await Reservation.findByIdAndUpdate(
        req.params.id, 
        { status: 'rejected', rejectReason: rejectReason || 'ピット満車のため' }, 
        { new: true }
    );
    res.json(reservation);
});

app.listen(PORT, () => console.log(`🚀 サーバー起動: ${PORT}`));