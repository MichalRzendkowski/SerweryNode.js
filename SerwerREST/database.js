import { Sequelize, DataTypes } from 'sequelize';

export class Database {

    constructor(){
        this.sequelize = new Sequelize({
          dialect: 'sqlite',
          storage: './database.sqlite',
          logging: false
        });

        this.Gear = this.sequelize.define('Gear', {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            pricePerHour: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false
            }
        });

        this.Reservation = this.sequelize.define('Reservation', {
            id: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            date: {
                type: DataTypes.DATE,
                allowNull: false
            },
            duration: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            amount:{
                type: DataTypes.INTEGER,
                allowNull: false
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false
            }
        });

        this.Gear.hasMany(this.Reservation, {
            foreignKey: 'gearId'
        });

        this.Reservation.belongsTo(this.Gear, {
            foreignKey: 'gearId'
        });
    }

    async init() {
        await this.sequelize.sync();
    }

    async getAllGear(){
        return this.Gear.findAll({
            order: [['pricePerHour', 'DESC']],
            attributes: ["id", "name", "pricePerHour"]
        });
    }

    async addGear(name, pricePerHour) {
        return this.Gear.create({
            name,
            pricePerHour
        });
    }

    async generateReservationId(gearName, date) {

        const prefix = gearName.substring(0,3).toUpperCase();
        const d = new Date(date);
        const month = String(d.getMonth()).padStart(2,'0');
        const day = String(d.getDate()).padStart(2,'0');
        const base = `${prefix}-${month}${day}`;
        const last = await this.Reservation.findOne({
            where: {
                id: {
                    [Sequelize.Op.like]: `${base}-%`
                }
            },
            order: [['id', 'DESC']]
        });

        let counter = Math.floor(Math.random() * (4000)) + 1000;
        if (last) {
            const parts = last.id.split('-');
            counter = parseInt(parts[2]) + 1;
        }
        const counterStr = String(counter).padStart(4,'0');

        return `${base}-${counterStr}`;
    }   

    async addReservation(gearId, date, duration ,amount, email) {
        const gear = await this.Gear.findByPk(gearId);
        const id = await this.generateReservationId(gear.name, date);
        return this.Reservation.create({
            id,
            gearId,
            date,
            duration,
            amount,
            email
        });
    }

    async getReservation(id){
        return await this.Reservation.findOne({
            where: { id },
            include: this.Gear
        });
    }

    async removeReservation(id){
        return await this.Reservation.destroy({
            where: { id }
        });
    }

    async getPrice(name, hours) {
        const gear = await this.Gear.findOne({
            where: { name },
            attributes: ['pricePerHour']
        });

        if (!gear) return null;

        return parseFloat(gear.pricePerHour) * hours;
    }

    async getGear(name){
        return this.Gear.findOne({
            where: { 'name' : name }
        });
    }
}