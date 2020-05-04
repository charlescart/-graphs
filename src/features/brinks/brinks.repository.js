/* eslint-disable no-continue */
/* eslint-disable quotes */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
const moment = require('moment');
const {
  getFirstStrip,
  getDurationInTraffic,
  getArrival,
  getNumberTimeBandsAvailabilitys,
  checkExpiredTimeSlot,
} = require("../../services/brinks.service");

const brinksRepository = {
  algorithm: async (req) => {
    const { nodes } = req.body;
    const { hourDeparture } = req.body;

    // eslint-disable-next-line no-useless-catch
    // try {
    /* fecha actual, para api traffic */
    const currentDate = moment("00:00:00", "HH:mm:ss");

    /* hora de partida */
    const currentTime = moment.duration(hourDeparture);

    /* tomo el node de orden cero, este siempre es el primero del array */
    const nodeRoot = nodes.shift();

    /* nodos no cumplidos */
    const unfulfilledNodes = [];

    /* ruta optima */
    // let route = [nodeRoot];

    do {
      for (let i = 0; i < nodes.length; i += 1) {
        /* si el nodo está bloqueado no lo analizo */
        if (nodes[i].blocked) continue;

        const node = nodes[i];
        // nodes.forEach(async node => {

        /* calculo de cercania a la franja horaria */
        // let timeToNode = getTimeProximity(nodeRoot, node);

        const numberBands = await getNumberTimeBandsAvailabilitys(node, currentTime);

        /* la franja horaria mas cercana con respecto a la hora actual */

        const firstStrip = await getFirstStrip(node, currentTime);

        /* Cercania */
        const timeProximity = firstStrip.start.clone();
        timeProximity.subtract(currentTime);
        // moment.duration(moment.duration(firstStrip.start).subtract(currentTime));

        /* Ancho de franja horaria de atencion */
        const timeBandWidth = firstStrip.end.clone();
        timeBandWidth.subtract(firstStrip.start);
        // moment.duration(moment.duration(firstStrip.end) - moment.duration(firstStrip.start));

        /* si el tiempo de servicio va dentro de la franja horaria */
        if (node.serviceTimeWithin) timeBandWidth.subtract(moment.duration(node.serviceTime));

        /* hora de llegada al nodo */
        const timeInTraffic = await getDurationInTraffic(nodeRoot, node, currentDate, currentTime);

        /* verifica si pase la franja horaria en el tiempo de llegada con trafico */
        const expiredTimeSlot = await checkExpiredTimeSlot(currentTime, timeInTraffic, firstStrip);

        /* llega dentro de la franja horaria? */
        const arrival = await getArrival(node, currentTime, timeInTraffic, firstStrip);

        node.analysis = {
          timeProximity,
          timeBandWidth,
          timeInTraffic,
          arrival,
          hourArrival: moment.duration(currentTime + timeInTraffic),
          numberBands,
          expiredTimeSlot,
          // blockedNode: item que indique si el nodo se superpone a otro
        };

        console.log(`${node.description}: departure: ${currentTime} durationInTraffic: ${timeInTraffic.asSeconds()}
          timeArrival: ${moment.duration(currentTime + timeInTraffic)}, Arrival?: ${arrival}, Cercania: ${timeProximity.asSeconds()},
          anchodefranja: ${timeBandWidth.asSeconds()}, ${firstStrip.start} - ${firstStrip.end}, numberBands: ${numberBands},
          expiredTimeSlot: ${expiredTimeSlot}`);

        console.log(node);
      }

      /* identificando a los nodos con los que no se podrá cumplir */
      nodes.forEach((node, i, array) => {
        /* solo nodos disponibles  sin superposicion */
        if (!node.blocked) {
          const { expiredTimeSlot, numberBands } = node.analysis;

          /* se identifican los nodos caducados y se llevan a un array aparte */
          if (expiredTimeSlot && numberBands <= 0) unfulfilledNodes.push(array.splice(i, 1));
        }
      });
      /* fin de la identificacion de nodos no cumplidos */

      // TODO: esto puede ir dentro del primer for
      /* identificando el nodo mas urgente */
      let indexNodeSelect;

      for (let i = 0; i < nodes.length; i += 1) {
        /* solo eligo entre los nodos disponibles */
        if (nodes[i].blocked) continue;

        /* si no se ha inicializado la variable indexNode */
        if (indexNodeSelect === undefined) {
          indexNodeSelect = i;
          continue; // porque apenas se inicializa
        }

        const nodeA = moment.duration(nodes[indexNodeSelect].analysis.timeProximity);
        const nodeB = moment.duration(nodes[i].analysis.timeProximity);

        /* si el nodo A está mas lejano de la franja horaria que el B, me quedo con el B */
        if (nodeA.asSeconds() > nodeB.asSeconds()) {
          indexNodeSelect = i; // el nodo mas cercano a la hora de partida
        } else if (nodeA.asSeconds() === nodeB.asSeconds()) {
          /* decidir empate de cercania por propiedad numberBands */

          /* si la cercania es igual decide el nro de franjas horarias disponibles */
          const numberBandsA = nodes[indexNodeSelect].analysis.numberBands;
          const numberBandsB = nodes[i].analysis.numberBands;

          if (numberBandsA > numberBandsB) {
            indexNodeSelect = i; // el nodo con menos franjas horarias disponibles
          } else if (numberBandsA === numberBandsB) { // decidir empate de numberBands por prioridad
            const proirityA = nodes[indexNodeSelect].priority;
            const priorityB = nodes[i].priority;

            if (proirityA >= priorityB) indexNodeSelect = i; // el de prioridad max urgente
          }
        }
      }
      /* fin de identificacion del nodo mas urgente */

      console.log(`urgente:`, nodes[indexNodeSelect]);

    } while (false);

    console.log('nodes');
    console.log(nodes);
    console.log('unfulfilled nodes');
    console.log(unfulfilledNodes);

    return Promise.all(nodes);

    // return nodes;

    // eslint-disable-next-line no-unreachable
    // } catch (e) {
    //   throw e;
    // }
  },
};

module.exports = brinksRepository;
