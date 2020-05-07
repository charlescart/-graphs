/* eslint-disable no-continue */
const moment = require('moment');
const fetch = require('node-fetch');

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
  getFirstStrip: async (node, currentTime, timeInTraffic) => {
    const hourArrival = currentTime.clone();
    hourArrival.add(timeInTraffic);
    let firstStrip;
    let numberBands = 0;

    for (let i = 0; i < node.attentionHour.length; i += 1) {
      const hourEnd = moment.duration(node.attentionHour[i].end).clone();
      hourEnd.subtract(hourArrival);

      if (hourEnd.asSeconds() < 0) continue;

      // cuenta las bandas vidas
      numberBands += 1;

      if (firstStrip === undefined) {
        firstStrip = node.attentionHour[i];
        continue;
      }

      const afterStrip = moment.duration(firstStrip.end);
      afterStrip.subtract(hourArrival);

      if (afterStrip > hourEnd) firstStrip = node.attentionHour[i];
    }

    /* haciendo una duracion start and end */
    if (firstStrip !== undefined) {
      firstStrip.start = moment.duration(firstStrip.start);
      firstStrip.end = moment.duration(firstStrip.end);
    }

    // no cuento la franja que se selecciono, solo las restantes.
    if (numberBands > 0) numberBands -= 1;

    return { firstStrip, numberBands };
  },

  /* description */
  getDurationInTraffic: async (nodeA, nodeB, currentDate, currentTime) => {
    const baseUrl = 'https://router.hereapi.com/v8/routes?';
    const apiKey = process.env.API_KEY_TRAFFIC;

    let time = moment(currentDate);
    time.add(currentTime);
    time = time.format('YYYY-MM-DDTHH:mm:ss');

    const timeInTraffic = await fetch(`${baseUrl}transportMode=car&origin=${nodeA.coordinates.lat},${nodeA.coordinates.lng}&destination=${nodeB.coordinates.lat},${nodeB.coordinates.lng}&return=summary&departureTime=${time}&apiKey=${apiKey}`)
      .then((res) => res.json())
      .then((res) => res.routes[0].sections[0].summary.duration);

    return {
      description: nodeB.description,
      time: moment.duration(timeInTraffic, 'seconds'),
    };
  },

  /* description */
  getTrafficTimes: async (nodeRoot, nodes, currentDate, currentTime) => {
    const trafficTimes = [];

    for (let i = 0; i < nodes.length; i += 1) {
      if (nodes[i].blocked) continue;
      // eslint-disable-next-line max-len
      trafficTimes.push(brinksService.getDurationInTraffic(nodeRoot, nodes[i], currentDate, currentTime));
    }

    return Promise.all(trafficTimes);
  },


  /* description */
  getArrival: async (node, currentTime, durationInTraffic, firstStrip) => {
    const start = moment('00:00:00', 'HH:mm:ss');
    start.add(firstStrip.start);

    const end = moment('00:00:00', 'HH:mm:ss');
    end.add(firstStrip.end);

    const hourArrival = moment('00:00:00', 'HH:mm:ss');
    hourArrival.add(currentTime);
    hourArrival.add(durationInTraffic);

    return hourArrival.isBetween(start, end, null, '[]');
  },

  /* description */
  // TODO: la no la uso
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
  // TODO: la no la uso
  checkExpiredTimeSlot: async (currentTime, durationInTraffic, firstStrip) => {
    const hourArrival = currentTime.clone();
    hourArrival.add(durationInTraffic);

    /* si la hora en la que llega es mayor a la hora final de la franja, la franja ya ha vencido */
    return hourArrival > firstStrip.end;
  },

  /* description */
  complianceWithZeroBandNodes: async (nodes, indexNodeSelect, nodesBandsZero, currentDate) => {
    let indexNodeZero;
    const unfulfilledNodes = [];
    const nodeA = nodes[indexNodeSelect];
    const { hourDeparture } = nodeA.analysis;

    for (let i = 0; i < nodesBandsZero.length; i += 1) {
      const nodeB = nodes[nodesBandsZero[i]];

      // eslint-disable-next-line no-await-in-loop
      const timeInTraffic = await brinksService
        .getDurationInTraffic(nodeA, nodeB, currentDate, hourDeparture);

      const hourArrival = hourDeparture.clone();
      hourArrival.add(timeInTraffic.time);

      /* si la hora de arrival es mayor a la hora final de la franja, la franja ya ha vencido */
      const expiredTimeSlot = hourArrival > nodeB.analysis.firstStrip.end;
      if (expiredTimeSlot) unfulfilledNodes.push({ expiredTimeSlot, index: nodesBandsZero[i] });
    }

    /* eleccion con de nodo con mas prioridad */
    for (let i = 0; i < unfulfilledNodes.length; i += 1) {
      if (indexNodeZero === undefined) {
        indexNodeZero = unfulfilledNodes[i].index;
        continue;
      }
      const nodeZeroA = nodes[indexNodeZero];
      const nodeZeroB = nodes[unfulfilledNodes[i].index];

      // el de prioridad max urgente
      if (nodeZeroA.priority > nodeZeroB.priority) {
        indexNodeZero = unfulfilledNodes[i].index; // nodo mas prioritario
      } else if (nodeZeroA.priority === nodeZeroB.priority) { // en caso de empate de prioridad
        if (nodeZeroA.analysis.timeBandWidth >= nodeZeroB.analysis.timeBandWidth) {
          // se toma el de ancho de banda mas pequeña
          indexNodeZero = unfulfilledNodes[i].index;
        }
      }
    }
    /* fin de eleccion con de nodo con mas prioridad */

    return indexNodeZero;
  },

  /* description */
  getNodesAvailabilitys: async (nodes) => {
    let count = false;
    for (let i = 0; i < nodes.length; i += 1) {
      if (nodes[i].blocked) continue;
      count = true;
      i = nodes.length;
    }

    return count;
  },
};

module.exports = brinksService;
