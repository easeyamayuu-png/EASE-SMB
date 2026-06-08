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

// 📥 API①：予約を申し込む
app.post('/api/reservations', async (req, res) => {
    try {
        const newReservation = new Reservation(req.body);
        await newReservation.save();
        res.status(201).json(newReservation);
    } catch (error) {
        res.status(500).json({ error: '予約に失敗しました' });
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

// 🟢 API③：予約を承認する
app.use('/api/reservations/:id/approve', async (req, res) => {
    try {
        const reservation = await Reservation.findByIdAndUpdate(
            req.params.id, 
            { status: 'approved' }, 
            { new: true }
        );
        console.log(`【LINE模擬送信】${reservation.customerName}様、入庫予約が確定しました！`);
        res.json(reservation);
    } catch (error) {
        res.status(500).json({ error: '承認処理に失敗しました' });
    }
});

// 🔴 API④：予約をお断りする
app.use('/api/reservations/:id/reject', async (req, res) => {
    try {
        const { rejectReason } = req.body;
        const reservation = await Reservation.findByIdAndUpdate(
            req.params.id, 
            { status: 'rejected', rejectReason: rejectReason || 'ピット満車のため' }, 
            { new: true }
        );
        console.log(`【LINE模擬送信】${reservation.customerName}様、大変申し訳ありませんが、今回のご予約はお受けできません。理由: ${rejectReason}`);
        res.json(reservation);
    } catch (error) {
        res.status(500).json({ error: '拒否処理に失敗しました' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 クラウド対応サーバーがポート ${PORT} で起動しました！`);
});