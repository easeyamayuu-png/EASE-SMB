const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 🔌 データベース（MongoDB）への接続設定
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ease_smb';
mongoose.connect(mongoURI)
    .then(() => console.log('🍃 MongoDBに無事接続されました！'))
    .catch(err => console.error('❌ DB接続エラー:', err));

// 📝 予約データの仕組み（スキーマ）を定義
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

// 📥 API①：予約を申し込む（フォーム / ボード共通）
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
        console.error('LINE通知エラー:', error);
        res.status(500).json({ error: 'LINE通知失敗' });
    }
});

// 📤 API②：予約一覧を取得する
app.get('/api/reservations', async (req, res) => {
    try {
        const reservations = await Reservation.find();
        const formatted = reservations.map(r => ({
            id: r._id,
            customerName: r.customerName,
            carModel: r.carModel,
            carNumber: r.carNumber,
            menu: r.menu,
            datetime: r.datetime,
            status: r.status,
            rejectReason: r.rejectReason
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: 'データ取得に失敗しました' });
    }
});

// 🟢 API③：予約を承認する (app.use → app.patch に修正)
app.patch('/api/reservations/:id/approve', async (req, res) => {
    try {
        const reservation = await Reservation.findByIdAndUpdate(
            req.params.id, 
            { status: 'approved' }, 
            { new: true }
        );
        console.log(`✅ 承認完了: ${reservation.customerName}様`);
        res.json(reservation);
    } catch (error) {
        res.status(500).json({ error: '承認処理に失敗しました' });
    }
});

// 🔴 API④：予約をお断りする (app.use → app.patch に修正)
app.patch('/api/reservations/:id/reject', async (req, res) => {
    const { rejectReason } = req.body; //
    try {
        const { rejectReason } = req.body;
        const reservation = await Reservation.findByIdAndUpdate(
            req.params.id, 
            { status: 'rejected', rejectReason: rejectReason || 'ピット満車のため' }, 
            { new: true }
        );
        console.log(`❌ お断り完了: ${reservation.customerName}様`);
        res.json(reservation);
    } catch (error) {
        res.status(500).json({ error: '拒否処理に失敗しました' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 クラウド対応サーバーがポート ${PORT} で起動しました！`);
});