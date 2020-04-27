# How to use

# For post methods
Download postman from https://www.getpostman.com/
Choose POST
Introduce the url provided.
In body section choose 'raw' and JSON option
Introduce a payment json valid.

# Authorization
This API rest uses Basic Authorization. To use in Postman, in the request click on Authorization pannel and in dropdown Type select: Basic Auth. Then, complete username and password with your user depending if you are in test or prod.
Credentials for test:
- username: api_testing@gmail.com
- password: fletnet

To use this api in production send an email to support@fletnet.com.ar or contact with a developer from the company.

# Port
For testing use port 9999.
For production use port 8080.

# create new order
URL: http://localhost:9999/v1/order/create
Body of express type:
{
    "title": "Notebook Express HP",
    "origin": {
        "latitude": -34.5673135,
        "longitude": -58.5486278
    },
    "destinations": [{
        "latitude": -34.570124,
        "longitude": -58.544502
    }],
    "uid": "R9BjXoR6hifxF2aTI881fDhLCZ42",
    "assistant": false,
    "since_time": "09:00",
    "until_time": "21:00",
    "order_date": "30/11/2018",
    "withReturn": false,
    "pay_origin": false,
    "pay_destination": true,
    "vehicle_type": "utilitary",
    "type": "express"
}
Body of distribution type:
{
    "title": "Notebook Distribution HP",
    "origin": {
        "latitude": -34.5673135,
        "longitude": -58.5486278
    },
    "destinations": [{
        "latitude": -34.570124,
        "longitude": -58.544502
    },
    {   "latitude": -34.576469,
        "longitude": -58.539910
    }],
    "uid": "R9BjXoR6hifxF2aTI881fDhLCZ42",
    "assistant": false,
    "since_time": "09:00",
    "until_time": "21:00",
    "order_date": "30/11/2018",
    "withReturn": true,
    "pay_origin": true,
    "pay_destination": false,
    "vehicle_type": "utilitary",
    "type": "distribution"
}
Required fields:
title ; description ; category ; origin ; destination ; uid ; with_return ; pay_origin ; pay_destination ; vehicle_type ; type

Vehicles:
motorcycle: moto
car: auto
utilitary: utilitario
camiochic: camioneta chica
camiogde: camioneta grande
camionchic: camión chico
camiongde: camión grande

Types:
express: pedido rápido
distribution: reparto (not available yet)
rent: renta de vehículo (not available yet)

uid: id of client, you can get this with GET method: 

# calculate order price

URL: http://localhost:9999/v1/order/calculate_price
Body:
{
    "origin": {"latitude":-34.5673135,"longitude":-58.5486278},
    "destination": {"latitude":-34.570124,"longitude":-58.544502},
    "vehicle_type": "utilitary",
    "with_return": false,
    "assistant": true
}

Required fields:
origin ; destination ; vehicle_type ; with_return ; assistant

# get order

URL: http://localhost:9999/v1/order/{uid}

Required fields:
uid (param parameter)

uid example: -LSk3rb5-jjZh2-g4G7f

# Install npm-check-updates (ncu)
Url: https://www.npmjs.com/package/npm-check-updates

- Instalar de forma global
```
npm install -g npm-check-updates
```

- Ejecutar el comando  ncu para ver todas la librerias desatualizadas
```
ncu
```

```
Checking package.json
[====================] 5/5 100%
 
 express           4.12.x  →   4.13.x
 multer            ^0.1.8  →   ^1.0.1
 react-bootstrap  ^0.22.6  →  ^0.24.0
 react-a11y        ^0.1.1  →   ^0.2.6
 webpack          ~1.9.10  →  ~1.10.5
 
Run ncu -u to upgrade package.json
```

- Aplicar la actualizacion a las nuevas versiones en el package.json
```
ncu -u
```
```
Upgrading package.json
[====================] 1/1 100%
 
 express           4.12.x  →   4.13.x
 
Run npm install to install new versions.
```

- Aplicar instalacion de dependencias actualizadas
```
npm install
```