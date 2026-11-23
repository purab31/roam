const mongoose = require('mongoose');
const Vehicle = require('../src/models/vehicle.model');
const config = require('../src/config/env');

const imageMappings = [
  { brand: 'Volkswagen', model: 'Virtus', file: '01_Volkswagen_Virtus.jpg' },
  { brand: 'Skoda', model: 'Slavia', file: '02_Skoda_Slavia.jpg' },
  { brand: 'Honda', model: 'Amaze', file: '03_Honda_Amaze.jpg' },
  { brand: 'Toyota', model: 'Camry', file: '04_Toyota_Camry.jpg' },
  { brand: 'Honda', model: 'City', file: '05_Honda_City.jpg' },
  { brand: 'Maruti Suzuki', model: 'Ciaz', file: '06_Maruti_Suzuki_Ciaz.jpg' },
  { brand: 'Tata', model: 'Tiago EV', file: '07_Tata_Tiago_EV.jpg' },
  { brand: 'Tata', model: 'Nexon EV', file: '08_Tata_Nexon_EV.jpg' },
  { brand: 'Tata', model: 'Altroz', file: '09_Tata_Altroz.jpg' },
  { brand: 'Tata', model: 'Punch', file: '10_Tata_Punch.jpg' },
  { brand: 'Audi', model: 'A4', file: '11_Audi_A4.jpg' },
  { brand: 'Mercedes-Benz', model: 'GLA', file: '12_Mercedes_Benz_GLA.jpg' },
  { brand: 'BMW', model: '5 Series', file: '13_BMW_5_Series.jpg' },
  { brand: 'Toyota', model: 'Innova Crysta', file: '14_Toyota_Innova_Crysta.jpg' },
  { brand: 'Mercedes-Benz', model: 'E-Class', file: '15_Mercedes_Benz_E_Class.jpg' },
  { brand: 'Tata', model: 'Safari', file: '16_Tata_Safari.jpg' },
];

(async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('[MapImages] Connected to MongoDB');

    let updatedCount = 0;

    for (const mapping of imageMappings) {
      const vehicle = await Vehicle.findOne({
        brand: mapping.brand,
        model: mapping.model,
      });

      if (!vehicle) {
        console.warn(`[MapImages] Vehicle not found: ${mapping.brand} ${mapping.model}`);
        continue;
      }

      const imageUrl = `/uploads/images/${mapping.file}`;
      vehicle.images = [
        {
          url: imageUrl,
          isCover: true,
          order: 0,
          caption: `${vehicle.brand} ${vehicle.model} - Exterior Profile`,
        },
      ];

      await vehicle.save();
      console.log(`[MapImages] Updated ${mapping.brand} ${mapping.model} -> ${imageUrl}`);
      updatedCount++;
    }

    console.log(`[MapImages] Successfully mapped images to ${updatedCount} vehicles.`);
  } catch (err) {
    console.error('[MapImages Error]:', err);
  } finally {
    await mongoose.disconnect();
    console.log('[MapImages] Disconnected from MongoDB');
  }
})();
