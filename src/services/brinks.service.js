/* eslint-disable quotes */
const moment = require("moment");
const fetch = require("node-fetch");

const brinksService = {
  /* Funcion que obtiene la hora mas al final del dia de todas las franjas horarias de un nodo */
  //   getTimeFinal: async (node) => {
  //     let finalTime = node.attentionHour.reduce((a, b) => {
  //       /* ubico la hora mas al final del dia, esa es la hora limite del nodo */
  //       return moment.duration(a.end) > moment.duration(b.end) ? a : b;
  //     });

  //     finalTime = moment.duration(finalTime.end);

  //     // si el tiempo de serivicio va dentro de la franja horaria
  //     if (node.serviceTimeWithin) {
  //       const serviceTime = moment.duration(node.serviceTime);
  //       finalTime.subtract(serviceTime);
  //     }

  //     return finalTime;
  //   },

  /* description */
  getFirstStrip: async (node, currentTime) => {
    const firstStrip = node.attentionHour.reduce(
      (a, b, index, attentionHours) => {
        const hourStartA = moment.duration(a.start);
        const hourStartB = moment.duration(b.start);

        if (hourStartA < hourStartB) return a;
        // eslint-disable-next-line no-else-return
        else if (hourStartB >= currentTime) return b;

        const hourEndB = moment.duration(b.end);
        /* si la franja venció entonces eliminamos dicha franja horaria */
        if (hourEndB <= currentTime) attentionHours.splice(index, 1);
        else return b;

        return a; // si eliminamos la franja horaria en el if, devuelvo la franja A

        // eslint-disable-next-line comma-dangle
      }
    );

    return firstStrip;
  },

  /* description */
  getDurationInTraffic: async (nodeA, nodeB, currentDate, currentTime) => {
    const baseUrl = "https://router.hereapi.com/v8/routes?";
    const apiKey = process.env.API_KEY_TRAFFIC;

    let time = moment(currentDate);
    time.add(currentTime);
    time = time.format("YYYY-MM-DDTHH:mm:ss");

    const timeInTraffic = await fetch(
      `${baseUrl}transportMode=car&origin=${nodeA.coordinates.lat},${nodeB.coordinates.lng}&destination=${nodeB.coordinates.lat},${nodeB.coordinates.lng}&return=summary&departureTime=${time}&apiKey=${apiKey}`
    )
      .then((res) => res.json())
      .then((res) => res.routes[0].sections[0].summary.duration);

    return moment.duration(timeInTraffic, "seconds");
  },

  /* description */
  getArrival: async (node, currentTime, durationInTraffic, strip) => {
    const start = moment(strip.start, "HH:mm");
    const end = moment(strip.end, "HH:mm");

    const hourArrival = moment(`00:00:00`, "HH:mm:ss");
    hourArrival.add(currentTime);
    hourArrival.add(durationInTraffic);

    return moment(hourArrival).isBetween(start, end, null, "[]");
  },

  /* description */
  getNumberTimeBandsAvailabilitys: async (node, currentTime) => {
    let numberBands = 0;

    for (let i = 0; i < node.attentionHour.length; i += 1) {
      const timeBand = moment.duration(node.attentionHour[i].end);
      if (currentTime < timeBand) numberBands += 1;
    }

    /* le resto 1 para identificar cuantas restan, no tomar encuenta en la franja en curso */
    numberBands -= 1;

    return numberBands;
  },

  /* description */
  checkExpiredTimeSlot: async (currentTime, durationInTraffic, firstStrip) => {
    const hourArrival = currentTime.clone();
    hourArrival.add(durationInTraffic);
    const hourEnd = moment.duration(firstStrip.end);

    /* si la hora en la que llega es mayor a la hora final de la franja, la franja ya ha vencido */
    return hourArrival > hourEnd;
  },
};

module.exports = brinksService;
