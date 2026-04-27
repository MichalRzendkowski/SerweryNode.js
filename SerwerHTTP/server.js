import express from "express";
import { Database } from "./database.js";

const PORT = 3000;

// Inicjalizaca expressa
const app = express();
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// Utworzenie bazy danych
const db = new Database();
await db.init();
const allGear = await db.getAllGear();
if (allGear.length === 0) {
    await db.addGear("Rower", 20);
    await db.addGear("Holajnoga", 15);
    await db.addGear("Rolki", 10);
}

// Główna strona z formularzem do rezerwacji
app.get("/", async (req, res) => {
    const gear = await db.getAllGear();
    res.render("index", { gear, old:null, errors:null });
});

// Nowa rezerwacja
app.post("/rezerwacja", async (req, res) => {
    const { gearId, date, hour, duration, amount, email } = req.body;
    const errors = [];

    // Walidacja danych

    if (!gearId) errors.push("Wybierz sprzęt");

    if (!duration || duration <= 0) errors.push("Czas rezerwacji musi być większy niż 0");

    if (!amount || amount <= 0) errors.push("Ilość sprzętu musi być większa niż 0");

    if (!hour) errors.push("Podaj godzinę rezerwacji");
    if (hour <= 0 || hour >= 24) errors.push("Niepoprawna godzina rezerwacji");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errors.push("Niepoprawny email");
    }

    if (!date) errors.push("Podaj datę rezerwacji");
    if (new Date(date) < new Date()) {
        errors.push("Niepoprawna data");
    }

    if (errors.length > 0) {
        const gear = await db.getAllGear();

        return res.render("index", {
            gear,
            errors,
            old: req.body
        });
    }

    const gear = await db.Gear.findByPk(gearId);
    const pricePerHour = parseFloat(gear.pricePerHour);
    const totalPrice = pricePerHour * duration * amount;

    const add = await db.addReservation(
        gearId,
        date,
        hour,
        duration,
        amount,
        email
    );

    const reservation = await db.getReservation(add.id);

    res.render("result", {
        newReservation: true,
        price: totalPrice,
        reservation,
        id: reservation.id,
        name: reservation.Gear.name
    });
});

// Informacje o rezerwacji
app.get("/rezerwacja", async (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.send("Wymagane ID rezerwacji");
    }

    const reservation = await db.getReservation(id);

    if (!reservation) {
        return res.send("Nie znaleziono rezerwacji o podanym ID");
    }

    const totalPrice = parseFloat(reservation.Gear.pricePerHour) * reservation.duration * reservation.amount;

    res.render("result", {
        price: totalPrice,
        reservation,
        id: reservation.id,
        newReservation: true,
        name: reservation.Gear.name
    });
});

// Odwołanie rezerwacji
app.post("/odwolaj_rezerwacje", async (req, res) => {

    const { id } = req.body;

    if (!id) {
        return res.send("Wymagane ID rezerwacji");
    }

    const reservation = await db.getReservation(id);

    if (!reservation) {
        return res.send("Nie znaleziono rezerwacji o podanym ID");
    }

    await db.removeReservation(id);

    res.render("result", {
        newReservation: false,
        id
    });
});

app.listen(PORT, () =>
    console.log(`Server listening on http://localhost:${PORT}`)
);
