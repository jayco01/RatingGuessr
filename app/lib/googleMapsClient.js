import {PlacesClient} from "@googlemaps/places";

// client object is initiated here so it can be reused.
// we pass the api key when it is used/called
const client = new PlacesClient(
);

export default client;