/* eslint-disable no-continue */
/* eslint-disable quotes */
/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
const moment = require('moment');
const {
  getFirstStrip,
  getDurationInTraffic,
  getArrival,
  complianceWithZeroBandNodes,
  getNodesAvailabilitys,
  getTrafficTimes,
} = require("../../services/brinks.service");

const brinksRepository = {
  algorithm: async (req) => {
    /* tiempo por cada parada */
    const timePerStop = moment.duration(300, 'seconds');

    const { nodes, hourDeparture } = req.body;
    /* fecha actual, para api traffic */
    const currentDate = moment("00:00:00", "HH:mm:ss");
    /* hora de partida */
    let currentTime = moment.duration(hourDeparture);
    /* tomo el node de orden cero, este siempre es el primero del array */
    let nodeRoot = nodes.shift();
    /* nodos no cumplidos */
    let unfulfilledNodes = [];
    /* ruta optima */
    const route = [nodeRoot];

    do {
      /* +++ */
      console.log(`# # # # # # # # # # # #`);
      /* Proximo nodo seleccionado */
      let indexNodeSelect;
      /* nodes con franjas horarias en cero */
      let nodesBandsZero = [];
      /* tiempos de nodo root contra todos los nodos disponibles */
      const trafficTimes = await getTrafficTimes(nodeRoot, nodes, currentDate, currentTime);
      // TODO: antes de hacer los gets filtrar y sacar los vencidos
      console.log(trafficTimes);

      for (let i = 0; i < nodes.length; i += 1) {
        /* si el nodo está bloqueado no lo analizo */
        if (nodes[i].blocked) continue;
        const node = nodes[i];

        /* HORA DE LLEGADA AL NODO */
        let timeInTraffic;
        for (let j = 0; j < trafficTimes.length; j += 1) {
          // el tiempo de trafico entre nodo root y este nodo
          if (i === trafficTimes[j].index) {
            timeInTraffic = trafficTimes[j].time;
            break;
          }
        }
        /* FIN DE HORA DE LLEGADA AL NODO */
        // TODO: validar que timeInTraffic no sea undefined

        /* NUMERO DE FRANJAS A PARTIR DE LA HORA DE PARTIDA */
        // // const numberBands = getNumberTimeBandsAvailabilitys(node, currentTime);
        // let numberBands = 0;
        // for (let a = 0; a < node.attentionHour.length; a += 1) {
        //   const timeBand = moment.duration(node.attentionHour[a].end);
        //   if (moment.duration(currentTime + timeInTraffic) < timeBand) numberBands += 1;
        // }
        // /* le resto 1 para identificar cuantas restan, no tomar encuenta en la franja en curso */
        // if (numberBands > 0) numberBands -= 1;
        /* FIN DE NUMERO DE FRANJAS A PARTIR DE LA HORA DE PARTIDA */


        /* la franja horaria mas cercana con respecto a la hora de salida */
        const { firstStrip, numberBands } = await getFirstStrip(node, currentTime, timeInTraffic);

        /* este nodo es un unfulfilled */
        if (firstStrip === undefined) {
          const nodePull = nodes.splice(i, 1);
          unfulfilledNodes.push(nodePull[0]);
          continue;
        }

        /* nodos importantes */
        if (numberBands === 0) nodesBandsZero.push(i);

        /* Cercania */
        const timeProximity = firstStrip.start.clone();
        timeProximity.subtract(currentTime);

        /* Ancho de franja horaria de atencion */
        const timeBandWidth = firstStrip.end.clone();
        timeBandWidth.subtract(firstStrip.start);

        /* si el tiempo de servicio va dentro de la franja horaria */
        if (node.serviceTimeWithin) timeBandWidth.subtract(moment.duration(node.serviceTime));

        /* verifica si pase la franja horaria en el tiempo de llegada con trafico */
        // const expiredTimeSlot = await checkExpiredTimeSlot(currentTime, timeInTraffic, firstStrip);

        /* llega dentro de la franja horaria? */
        const arrival = await getArrival(node, currentTime, timeInTraffic, firstStrip);

        /* tiempo de serivico en el nodo */
        const serviceTime = moment.duration(node.serviceTime);

        /* hourBase si se llega al nodo dentro de la franja */
        let hourBase = moment.duration(currentTime + timeInTraffic);
        /* hourBase si se llega antes de la franja horaria */
        if (!arrival) hourBase = firstStrip.start.clone();

        node.analysis = {
          firstStrip,
          timeProximity,
          timeBandWidth,
          timeInTraffic,
          arrival,
          numberBands,
          hourArrival: moment.duration(currentTime + timeInTraffic),
          hourDeparture: moment.duration(hourBase + timePerStop + serviceTime),
          // blockedNode: item que indique si el nodo se superpone a otro
        };

        console.log(`${node.description}: departure: ${currentTime} durationInTraffic: ${timeInTraffic.asSeconds()}
          timeArrival: ${moment.duration(currentTime + timeInTraffic)}, Arrival?: ${arrival}, Cercania: ${timeProximity.asSeconds()},
          anchodefranja: ${timeBandWidth.asSeconds()}, ${firstStrip.start} - ${firstStrip.end}, numberBands: ${numberBands}`);

        // console.log(node);

        /* identificando el nodo mas urgente */
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
        /* fin de identificacion del nodo mas urgente */
      }

      console.log(`Node urgente:`, nodes[indexNodeSelect]);

      // TODO: quitar if al volver el proceso a function
      if (indexNodeSelect !== undefined) {
        /* verificando que nodo urgente no hace incumplir con nodos de cero franjas disponibles */
        const { numberBands } = nodes[indexNodeSelect].analysis;
        if (indexNodeSelect !== undefined && numberBands >= 1 && nodesBandsZero.length > 0) {
          // eslint-disable-next-line max-len
          nodesBandsZero = await complianceWithZeroBandNodes(nodes, indexNodeSelect, nodesBandsZero, currentDate);

          /* seleccionando el importante, soltando al urgente */
          if (nodesBandsZero !== undefined) indexNodeSelect = nodesBandsZero;
        }
        /* fin de verificando que nodo urgente no hace incumplir nodo de cero franjas disponibles */

        console.log(`Node definitivo:`, nodes[indexNodeSelect]);

        /* seleccionando el nodo y ajustando variables */
        // TODO: liberar nodos dependientes del nodo seleccionado
        currentTime = nodes[indexNodeSelect].analysis.hourDeparture.clone();
        const difinitiveNode = nodes.splice(nodes[indexNodeSelect], 1);

        // eslint-disable-next-line prefer-destructuring
        nodeRoot = difinitiveNode[0];
        route.push(difinitiveNode[0]);
        /* fin de selección del nodo y ajustando variables */
      }
    } while (await getNodesAvailabilitys(nodes));

    console.log('nodes:', nodes);
    console.log('unfulfilled nodes:', unfulfilledNodes);
    console.log('Route:', route);

    unfulfilledNodes = unfulfilledNodes.concat(nodes);
    return { route, unfulfilledNodes };
  },
  promiseAll: async (req) => {
    const { nodes, hourDeparture } = req.body;
    /* fecha actual, para api traffic */
    const currentDate = moment("00:00:00", "HH:mm:ss");
    /* hora de partida */
    const currentTime = moment.duration(hourDeparture);
    /* tomo el node de orden cero, este siempre es el primero del array */
    const nodeRoot = nodes.shift();

    const promises = [];

    console.time('for');
    for (let i = 0; i < nodes.length; i += 1) {
      if (nodes[i].blocked) continue;
      promises.push(getDurationInTraffic(nodeRoot, nodes[i], currentDate, currentTime, i));
    }

    return Promise.all(promises)
      .then((res) => {
        console.log(res);
        console.timeEnd('for');
        return res;
      })
      .catch((err) => console.log(err));
  },
};

module.exports = brinksRepository;
