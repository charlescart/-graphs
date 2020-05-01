/* eslint-disable no-await-in-loop */
/* eslint-disable quotes */
/* eslint-disable comma-dangle */
const moment = require("moment");
const {
  getFirstStrip,
  getDurationInTraffic,
  getArrival,
  getNumberTimeBandsAvailabilitys,
  checkExpiredTimeSlot,
} = require("../../services/brinks.service");

const brinksRepository = {
  algorithm: async (req) => {
    let { nodes } = req.body;

    // eslint-disable-next-line no-useless-catch
    // try {
    /* fecha actual, para api traffic */
    const currentDate = moment("00:00:00", "HH:mm:ss");

    /* hora de partida */
    const currentTime = moment.duration(
      moment("05:09:00", "HH:mm:ss").format("HH:mm:ss")
    );

    /* tomo el node de orden cero, este siempre es el primero del array */
    let nodeRoot = nodes.shift();

    /* ruta optima */
    // let route = [nodeRoot];

    do {
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        // nodes.forEach(async node => {

        /* si el nodo está bloqueado no lo analizo */
        if (node.blocked) i += 1;

        /* calculo de cercania a la franja horaria */
        // let timeToNode = getTimeProximity(nodeRoot, node);

        const numberBands = await getNumberTimeBandsAvailabilitys(
          node,
          currentTime
        );

        /* la franja horaria mas cercana con respecto a la hora actual */

        const firstStrip = await getFirstStrip(node, currentTime);

        /* Cercania */
        const timeProximity = moment.duration(
          moment.duration(firstStrip.start).subtract(currentTime)
        );

        /* Ancho de franja horaria de atencion */
        const timeBandWidth = moment.duration(
          moment.duration(firstStrip.end) - moment.duration(firstStrip.start)
        );

        /* si el tiempo de servicio va dentro de la franja horaria */
        if (node.serviceTimeWithin) {
          timeBandWidth.subtract(moment.duration(node.serviceTime));
        }

        /* hora de llegada al nodo */
        const durationInTraffic = await getDurationInTraffic(
          nodeRoot,
          node,
          currentDate,
          currentTime
        );

        /* verifica si pase la franja horaria en el tiempo de llegada con trafico */
        const expiredTimeSlot = await checkExpiredTimeSlot(
          currentTime,
          durationInTraffic,
          firstStrip
        );

        /* llega dentro de la franja horaria? */
        const arrival = await getArrival(
          node,
          currentTime,
          durationInTraffic,
          firstStrip
        );

        node["analysis"] = {
          timeProximity,
          timeBandWidth,
          durationInTraffic,
          arrival,
          hourArrival: moment.duration(currentTime + durationInTraffic),
          numberBands,
          expiredTimeSlot,
          // blockedNode: item que indique si el nodo se superpone a otro
        };

        // eslint-disable-next-line no-console
        console.log(
          `${
            node.description
          }: departure: ${currentTime} durationInTraffic: ${durationInTraffic.asSeconds()} timeArrival: ${moment.duration(
            currentTime + durationInTraffic
          )}, Arrival?: ${arrival}, Cercania: ${timeProximity.asSeconds()}, anchodefranja: ${timeBandWidth.asSeconds()}, ${
            firstStrip.start
          } - ${
            firstStrip.end
          }, numberBands: ${numberBands}, expiredTimeSlot: ${expiredTimeSlot}`
        );

        // eslint-disable-next-line no-console
        console.log(node);
      }
    } while (false);

    // eslint-disable-next-line no-console
    console.log(nodes);

    return Promise.all(nodes);

    // return nodes;

    // eslint-disable-next-line no-unreachable
    // } catch (e) {
    //   throw e;
    // }
  },
};

module.exports = brinksRepository;
