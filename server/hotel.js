export const hotel = {
  name: "Haven House",
  location: "Goa, India",
  currency: "INR",
  nearbyHotels: {
    goa: [
      {
        name: "Sea Breeze Resort",
        distance: "3.2 km",
        type: "Resort",
        reason: "Close to Baga Beach",
      },
      {
        name: "Palm Grove Stay",
        distance: "4.8 km",
        type: "Boutique hotel",
        reason: "Near Panaji",
      },
      {
        name: "Sunset Cottages",
        distance: "6.1 km",
        type: "Villa stay",
        reason: "Quiet area near Calangute",
      },
    ],
  },
  facts: {
    checkin:
      "Check-in is from 3:00 PM and check-out is by 11:00 AM (India time). Early check-in and late check-out are subject to availability; ask reception on arrival.",
    pool:
      "Our outdoor swimming pool is open daily from 7:00 AM to 9:00 PM. Children must be accompanied by an adult. Pool access is included for staying guests.",
    breakfast:
      "Breakfast is served from 7:00 AM to 10:30 AM in the Garden Room. It is included with the Family Suite; for Classic King and Garden Twin it costs INR 650 per person per day.",
    cancellation:
      "Flexible rates can be cancelled free of charge until 48 hours before 3:00 PM on the arrival date (India time). Later cancellations and no-shows cost the first night's room rate. Promotional non-refundable rates cannot be refunded. Confirm the rate conditions before booking.",
    rooms:
      "Classic King sleeps up to 2 guests, Garden Twin up to 3, and Family Suite up to 4. Garden Twin is the lowest-priced room suitable for three guests. Room prices and inventory shown by this demo are simulated.",
    wifi:
      "Complimentary Wi-Fi is available in all rooms and public areas. Ask reception for the current access details.",
    parking:
      "Complimentary on-site parking is available, subject to space. Spaces cannot be reserved in this demo.",
    pets:
      "Pets are not permitted. For assistance-animal arrangements, contact reception before arrival.",
    accessibility:
      "Step-free access is available to the lobby and Garden Room. Two Classic King rooms have accessible bathrooms; reception must confirm specific accessibility needs and availability.",
    contact:
      "This is a fictional hotel demo. No real reservations or payments are taken. In a real deployment, reception contact information would appear here.",
  },
  rooms: [
    {
      id: "classic",
      name: "Classic King",
      capacity: 2,
      nightlyRate: 6200,
      inventory: 5,
      description: "A restful king bed, warm textures and a quiet courtyard outlook.",
      breakfast: false,
    },
    {
      id: "garden",
      name: "Garden Twin",
      capacity: 3,
      nightlyRate: 7800,
      inventory: 4,
      description: "Twin beds and a daybed, with a little extra room to unwind.",
      breakfast: false,
    },
    {
      id: "family",
      name: "Family Suite",
      capacity: 4,
      nightlyRate: 11200,
      inventory: 3,
      description: "Separate living space, a king bed and two comfortable single beds.",
      breakfast: true,
    },
  ],
};
