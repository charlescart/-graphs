/* eslint-disable no-continue */
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
  getValidNodes,
  selectTimeTrafficToNode,
  unlockDependentNodes,
} = require('../../services/brinks.service');

const brinksRepository = {
  algorithm: async (req) => {
    /* nodos, hora de salida y tiempo por nodo */
    const { hourDeparture } = req.body;
    let { nodes, timePerStop } = req.body;
    timePerStop = moment.duration(timePerStop);

    /* fecha actual, para api traffic */
    const currentDate = moment('00:00:00', 'HH:mm:ss');

    /* hora de partida */
    let currentTime = moment.duration(hourDeparture);

    /* nodo de inicio */
    let nodeRoot = nodes.shift();

    /* nodos no cumplidos */
    let unfulfilledNodes = [];

    /* ruta optima */
    const route = [nodeRoot];

    do {
      console.log('# # # # # # # # # # # #');
      /* Proximo nodo seleccionado */
      let indexNodeSelect;
      /* nodes con franjas horarias en cero */
      let nodesBandsZero = [];

      console.time('getValidNodes');
      nodes = getValidNodes(nodes, currentTime, unfulfilledNodes, nodeRoot);
      console.timeEnd('getValidNodes');

      console.time('getTrafficTimes');
      /* tiempos desde nodo root contra todos los nodos disponibles */
      const trafficTimes = await getTrafficTimes(nodeRoot, nodes, currentDate, currentTime);
      console.timeEnd('getTrafficTimes');

      console.log(trafficTimes);

      for (let i = 0; i < nodes.length; i += 1) {
        /* si el nodo está bloqueado no lo analizo */
        if (nodes[i].blocked) continue;
        const node = nodes[i];

        console.time('selectTimeTrafficToNode');
        const timeInTraffic = selectTimeTrafficToNode(node, trafficTimes);
        console.timeEnd('selectTimeTrafficToNode');

        console.time('getFirstStrip');
        /* la franja horaria mas cercana con respecto a la hora de salida */
        const { firstStrip, numberBands } = getFirstStrip(node, currentTime, timeInTraffic);
        console.timeEnd('getFirstStrip');

        /* este nodo es un unfulfilled */
        if (firstStrip === undefined) {
          console.log(`${node.description}: sin franja horaria disp!`);
          node.unfulfilled = {
            currentTime,
            timeInTraffic,
            from: nodeRoot.description,
            hourArrival: moment.duration(currentTime + timeInTraffic),
          };
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

        console.time('getArrival');
        /* llega dentro de la franja horaria? */
        const arrival = getArrival(node, currentTime, timeInTraffic, firstStrip);
        console.timeEnd('getArrival');

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
        };

        console.log(`${node.description}: departure: ${currentTime} durationInTraffic: ${timeInTraffic.asSeconds()}
          timeArrival: ${moment.duration(currentTime + timeInTraffic)}, Arrival?: ${arrival}, Cercania: ${timeProximity.asSeconds()},
          anchodefranja: ${timeBandWidth.asSeconds()}, ${firstStrip.start} - ${firstStrip.end}, numberBands: ${numberBands}`);

        /* identificando el nodo mas urgente */
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

      console.log('Node urgente:', nodes[indexNodeSelect]);

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

        console.log('Node definitivo:', nodes[indexNodeSelect]);

        /* seleccionando el nodo y ajustando variables */
        // TODO: liberar nodos dependientes(COTO) del nodo seleccionado
        currentTime = nodes[indexNodeSelect].analysis.hourDeparture.clone();
        const difinitiveNode = nodes.splice(indexNodeSelect, 1);

        // eslint-disable-next-line prefer-destructuring
        nodeRoot = difinitiveNode[0];
        route.push(difinitiveNode[0]);
        /* fin de selección del nodo y ajustando variables */
        if (nodeRoot.destination) unlockDependentNodes(nodeRoot, nodes);
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
    const currentDate = moment('00:00:00', 'HH:mm:ss');
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
