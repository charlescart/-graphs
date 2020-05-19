/* eslint-disable no-param-reassign */
/* eslint-disable no-console */
/* eslint-disable no-continue */
const moment = require('moment');
const fetch = require('node-fetch');

const brinksService = {
  /* description */
  getFirstStrip: (node, currentTime, timeInTraffic) => {
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
  getTrafficTimes: ({
    nodeRoot, nodes, currentDate, currentTime, unfulfilledNodes,
  }) => {
    const baseUrl = 'https://router.hereapi.com/v8/routes?';
    const apiKey = process.env.API_KEY_TRAFFIC;

    // TODO: esto puede ser un currentDate.clone();
    const hourDeparture = currentDate
      .clone()
      .add(currentTime)
      .format('YYYY-MM-DDTHH:mm:ss');

    const trafficTimes = [];

    for (let i = 0; i < nodes.length; i += 1) {
      if (nodes[i].blocked || nodes[i].unfulfilled) continue;

      const nodeIsInvalid = brinksService.getValidNodes(nodeRoot, nodes[i], unfulfilledNodes, currentTime);
      /* si el nodo es invalido lo excluyo de los query de traffic */
      if (nodeIsInvalid) continue;

      trafficTimes.push(
        fetch(`${baseUrl}transportMode=car&origin=${nodeRoot.coordinates.lat},${nodeRoot.coordinates.lng}&destination=${nodes[i].coordinates.lat},${nodes[i].coordinates.lng}&return=summary&departureTime=${hourDeparture}&apiKey=${apiKey}`)
          .then((res) => res.json())
          .then((res) => {
            const time = moment.duration(res.routes[0].sections[0].summary.duration, 'seconds');
            return { description: nodes[i].description, time };
            // eslint-disable-next-line comma-dangle
          })
      );
    }

    return Promise.all(trafficTimes);
  },


  /* description */
  getArrival: (node, currentTime, durationInTraffic, firstStrip) => {
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
  complianceWithZeroBandNodes: async (nodes, indexNodeSelect, nodesBandsZero, currentDate) => {
    const unfulfilledNodes = [];
    const nodeA = nodes[indexNodeSelect];
    const { hourDeparture } = nodeA.analysis;

    // TODO: hacer esto con Promise.all()
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

    let indexNodeZero;
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
        // se toma el de ancho de banda mas pequeña
        if (nodeZeroA.analysis.timeBandWidth >= nodeZeroB.analysis.timeBandWidth) {
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
      if (nodes[i].blocked || nodes[i].unfulfilled) continue;
      count = true;
      i = nodes.length;
    }

    return count;
  },

  /* Filtra los nodos sacando los que tienen todas las franja horarias vencidas
     y los que han sido marcados como "unfulfilled". */
  getValidNodes: (nodeRoot, node, unfulfilledNodes, currentTime) => {
    let nodeIsInvalid = true; // nodo invalido por default

    /* se verifica que exista por lo menos una franja viva */
    for (let i = 0; i < node.attentionHour.length; i += 1) {
      /* rango inferior de la franja horaria */
      const hourEnd = moment.duration(node.attentionHour[i].end);
      hourEnd.subtract(currentTime); // restandole la hora actual

      /* si la franja esta vencida "nodeIsInvalid" sigue en true */
      if (hourEnd.asSeconds() < 0) continue;

      /* si "nodeIsInvalid" es false, hay por lo menos una franja viva */
      nodeIsInvalid = false;
      break; /* no necesito verificar mas si ya tengo la 1ra franja viva */
    }

    /*
    * si el nodo se le han vencido todas la franjas y no ha sido declarado
    * anteriormente unfulfilled.
    */
    if (nodeIsInvalid && !node.unfulfilled) {
      node.unfulfilled = { currentTime, from: nodeRoot.description };
      unfulfilledNodes.push(node);
    }

    // TODO: quiero eliminar este if
    /* ya no se puede cumplir con este nodo */
    // if (nodeIsInvalid || node.unfulfilled) unfulfilledNodes.push(node);

    /* respuesta indicando si el nodo es invalido o no */
    return nodeIsInvalid;
  },
  /* selecciona el tiempo de trafico entre el nodo root y el nodo x. */
  selectTimeTrafficToNode: (node, trafficTimes) => {
    let timeInTraffic;

    // TODO: evaluar si es conveniente ir eliminando los traffic times seleccionados
    for (let i = 0; i < trafficTimes.length; i += 1) {
      if (node.description === trafficTimes[i].description) {
        timeInTraffic = trafficTimes[i].time;
        break;
      }
    }

    return timeInTraffic;
  },

  /* desbloquea los nodos dependientes de un nodo root */
  unlockDependentNodes: (nodeRoot, nodes) => {
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      if (nodeRoot.destination === node.description) {
        delete node.blocked;
        // eslint-disable-next-line no-console
        console.log(`${node.description} desbloqueado!`);
      }
    }
  },

  /* enviar a unfulfilled */
  goUnfulfilled: (node, nodeRoot, currentTime, timeInTraffic) => {
    console.log(`${node.description}: sin franja horaria disp!`);
    node.unfulfilled = {
      currentTime,
      timeInTraffic,
      from: nodeRoot.description,
      hourArrival: moment.duration(currentTime + timeInTraffic),
    };
  },

  /* description */
  analyticsTheNode: (nodeRoot, node, trafficTimes, currentTime, timePerStop) => {
    // console.time('selectTimeTrafficToNode');
    const timeInTraffic = brinksService.selectTimeTrafficToNode(node, trafficTimes);
    // console.timeEnd('selectTimeTrafficToNode');

    // console.time('getFirstStrip');
    /* la franja horaria mas cercana con respecto a la hora de salida */
    const { firstStrip, numberBands } = brinksService.getFirstStrip(node, currentTime, timeInTraffic);
    // console.timeEnd('getFirstStrip');

    /* este nodo es un unfulfilled */
    if (firstStrip === undefined) {
      /* lo categoriaza con unfullfilled */
      brinksService.goUnfulfilled(node, nodeRoot, currentTime, timeInTraffic);
    } else {
      /* Cercania */
      const timeProximity = firstStrip.start.clone();
      timeProximity.subtract(currentTime);

      /* Ancho de franja horaria de atencion */
      const timeBandWidth = firstStrip.end.clone();
      timeBandWidth.subtract(firstStrip.start);

      /* si el tiempo de servicio va dentro de la franja horaria */
      if (node.serviceTimeWithin) timeBandWidth.subtract(moment.duration(node.serviceTime));

      // TODO: mejorar tiempos de getArrival
      // console.time('getArrival');
      /* llega dentro de la franja horaria? */
      const arrival = brinksService.getArrival(node, currentTime, timeInTraffic, firstStrip);
      // console.timeEnd('getArrival');

      /* tiempo de serivicio en el nodo */
      const serviceTime = moment.duration(node.serviceTime);

      /* hourBase si se llega al nodo dentro de la franja */
      let hourBase = moment.duration(currentTime + timeInTraffic);

      /* si se llega antes de la franja horaria */
      if (!arrival) hourBase = firstStrip.start.clone();

      const hourDeparture = moment.duration(hourBase + timePerStop + serviceTime);
      const hourArrival = moment.duration(currentTime + timeInTraffic);

      node.analysis = {
        firstStrip,
        timeProximity,
        timeBandWidth,
        timeInTraffic,
        arrival,
        numberBands,
        hourArrival,
        hourDeparture,
      };
    }
  },

  /* nameless */
  nameless: async ({
    nodeRoot, route: nodes, hourDeparture, timePerStop, timeDeparture,
  }) => {
    nodes = JSON.stringify(nodes);
    nodes = JSON.parse(nodes);
    /* tiempo actual del recorrido */
    let currentTime = hourDeparture.clone();
    /* nodos no cumplidos */
    let unfulfilledNodes = [];

    /* nodo de inicio */
    let nodeInit = nodes.shift();

    /* ruta diseñada */
    const route = [nodeRoot];
    route.push(nodeInit);

    /* liberando los nodos del nodo seleccionado */
    brinksService.unlockDependentNodes(nodeInit, nodes);

    /* fecha actual, para api traffic */
    const currentDate = moment('00:00:00', 'HH:mm:ss');

    do {
      /* separando los nodos validos de los unfulfilleds */
      // nodes = brinksService.getValidNodes(nodeInit, nodes, unfulfilledNodes, currentTime);

      if (nodes.length <= 0) {
        console.log('CERO');
        break;
      }

      const paramsGetTraffic = {
        nodeRoot: nodeInit, nodes, currentDate, currentTime, unfulfilledNodes,
      };
      /* tiempos desde nodo root contra todos los nodos disponibles */
      const trafficTimes = await brinksService.getTrafficTimes(paramsGetTraffic);
      console.log(trafficTimes);
      console.log(`${nodeInit.description}`, nodes);

      /* Proximo nodo seleccionado */
      let indexNodeSelect;

      /* nodes con franjas horarias en cero */
      let nodesBandsZero = [];

      for (let i = 0; i < nodes.length; i += 1) {
        /* si el nodo está bloqueado no lo analizo */
        if (nodes[i].blocked || nodes[i].unfulfilled) continue;

        /* current node */
        const node = nodes[i];

        /* analytics del node */
        brinksService.analyticsTheNode(nodeRoot, node, trafficTimes, currentTime, timePerStop);
        /* no tiene banda horaria disp. */
        if (node.unfulfilled) continue;

        /* identificando nodos de cero bandas disp */
        if (node.analysis.numberBands <= 0) nodesBandsZero.push(i);

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
        // TODO: indexNodeSelect !== undefined, es innecesaria por lo visto.
        if (indexNodeSelect !== undefined && numberBands >= 1 && nodesBandsZero.length > 0) {
          nodesBandsZero = await brinksService.complianceWithZeroBandNodes(nodes, indexNodeSelect, nodesBandsZero, currentDate);

          /* seleccionando el importante, soltando al urgente */
          if (nodesBandsZero !== undefined) indexNodeSelect = nodesBandsZero;
        }
        /* fin de verificando que nodo urgente no hace incumplir nodo de cero franjas disponibles */

        console.log('Node definitivo:', nodes[indexNodeSelect]);

        /* seleccionando el nodo y ajustando variables */
        currentTime = nodes[indexNodeSelect].analysis.hourDeparture.clone();
        const difinitiveNode = nodes.splice(indexNodeSelect, 1);

        nodeInit = difinitiveNode[0];
        route.push(difinitiveNode[0]);

        /* fin de selección del nodo y ajustando variables */
        if (nodeInit.destination) brinksService.unlockDependentNodes(nodeInit, nodes);
      }
      // TODO: este await en el condicional no me gusta
    } while (await brinksService.getNodesAvailabilitys(nodes));

    unfulfilledNodes = unfulfilledNodes.concat(nodes);

    let totalDuration = moment.duration(0);
    if (route[route.length - 1].analysis) {
      totalDuration = moment.duration(route[route.length - 1].analysis.hourDeparture - timeDeparture);
    }

    return {
      hourDeparture: timeDeparture,
      totalDuration,
      route,
      unfulfilledNodes,
    };
  },
};

module.exports = brinksService;
