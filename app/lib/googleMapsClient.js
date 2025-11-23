import {Client} from "@googlemaps/google-maps-services-js";

// client object is initiated here so it can be reused.
// we pass the api key when it is used/called
const client = new Client({});

export default client;