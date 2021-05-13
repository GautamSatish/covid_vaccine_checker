const https = require('https');
const cp = require('child_process');
const config = require("./config.json");

let time = new Date();
let formattedDate = '';

const checkAppointments = function () {
  console.log(`Running check at ${new Date()}`);
  for (let i = 0; i < config.dayCount; i++) {
    // API date format is DD-MM-YYYY
    formattedDate = (time.getDate() + i) + "-" + (time.getMonth() + 1) + "-" + time.getFullYear();
    // console.log(`Looking for appointments on ${formattedDate}`);

    https.get(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${config.districtId}&date=${formattedDate}`, (resp) => {
      let data = '';
      let slotAvailable = false;
      // A chunk of data has been received.
      resp.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received. Check each session in each center for age match and availability.
      resp.on('end', () => {

        try {
          let d = JSON.parse(data);
          let centers;
          if (d.hasOwnProperty('centers')) {
            centers = d.centers;
            centers.forEach(center => {
              center.sessions.forEach(session => {
                if ((config.minAge >= session.min_age_limit) && (session.available_capacity > 0)) {
                  slotAvailable = true;
                  console.log(`${session.available_capacity} slots available at ${center.name}[${center.center_id}], ${center.block_name} ${center.district_name} on ${session.date}.`);
                }
              });
            });

            // Sound the Beeper if slot is found.
            if (config.soundNotify && slotAvailable)
              cp.exec(`rundll32 user32.dll,MessageBeep`);
          } else {
            console.log(`Unexpected response: ${data}.`);
          }

        } catch (err) {
          if (err.message.includes("Unexpected token < in JSON at position 0")) console.log("Error: Could not connect, there might be too much traffic.")
          else console.log("Error: " + err);
        }

      });

    }).on("error", (err) => {
      console.log("Error: " + err.message);
    });
  }
  // console.log(`Sleeping till next interval...`);
}
checkAppointments();
setInterval(checkAppointments, config.checkInterval * 1000);