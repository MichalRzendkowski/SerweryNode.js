import express from "express";
import { Database } from "./database.js";

const PORT = 3000;

// Inicjalizaca expressa
const app = express();
app.use(express.json());

// Utworzenie bazy danych
const db = new Database();
await db.init();
const allGear = await db.getAllGear();
if (allGear.length === 0) {
    await db.addGear("Rower", 20);
    await db.addGear("Holajnoga", 15);
    await db.addGear("Rolki", 10);
}

// Endpoint z listą sprzętu
app.get("/api/sprzet", async (req, res) => {
    const gear = await db.getAllGear();
    return res.status(200).json(gear);
});

// Nowa rezerwacja
app.post("/api/rezerwacja", async (req, res) => {
    const { gearId, date, duration, amount, email } = req.body;
    const fields = [];

    // Walidacja danych

    const gearCheck = await db.Gear.findByPk(gearId);
    if (!gearCheck || !Number.isInteger(gearId) || gearId <= 0) fields.push("gearId");

    if (!Number.isFinite(duration) || duration <= 0) fields.push("duration");

    if (!Number.isInteger(amount) || amount <= 0) fields.push("amount");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof(email) !== "string" || !emailRegex.test(email)) {
        fields.push("email");
    }

    const d = new Date(date);
    if (!date || isNaN(d.getTime()) || d < new Date() || d.getMinutes() != 0 || d.getSeconds() != 0) {
        fields.push("date");
    }

    if (fields.length > 0) {
        const gear = await db.getAllGear();

        return res.status(400).json({
            error:"niepoprawne dane",
            fields
        });
    }

    const gear = await db.Gear.findByPk(gearId);
    const pricePerHour = parseFloat(gear.pricePerHour);
    const totalPrice = pricePerHour * duration * amount;

    const add = await db.addReservation(
        gearId,
        date,
        duration,
        amount,
        email
    );

    const reservation = await db.getReservation(add.id);

    return res.status(201).json({
        id:reservation.id,
        gearId:reservation.gearId,
        amount:reservation.amount,
        date:reservation.date,
        duration:reservation.duration,
        email:reservation.email
    });
});

// Informacje o rezerwacji
app.get("/api/rezerwacja/:id", async (req, res) => {
    const { id } = req.params;
    const reservation = await db.getReservation(id);

    if (!reservation) {
        return res.status(400).json({
            error:"brak rezerwacji o podanym id"
        });
    }

    const totalPrice = parseFloat(reservation.Gear.pricePerHour) * reservation.duration * reservation.amount;

    return res.status(200).json({
        id:reservation.id,
        gearId:reservation.gearId,
        totalPrice:totalPrice,
        amount:reservation.amount,
        date:reservation.date,
        duration:reservation.duration,
        email:reservation.email
    });
});

// Odwołanie rezerwacji
app.delete("/api/rezerwacja/:id", async (req, res) => {

    const { id } = req.params;
    const reservation = await db.getReservation(id);

    if (!reservation) {
        return res.status(400).json({
            error:"brak rezerwacji o podanym id"
        });
    }

    await db.removeReservation(id);

    return res.status(200).json({});
});

// Obsługa błędów
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: "blad serwera"
  });
});

app.listen(PORT, () =>
    console.log(`Server listening on http://localhost:${PORT}`)
);
