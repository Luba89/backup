const jsc8 = require("jsc8");

//////THIS WILL CLEAR EVERYTHING FROM THE FABRIC; USE IT WITH CAUTION

const fabricName = "test"; // Name of the fabric that you want to clear
const url = ""; //Federation URL
apiKey = ""; //API key of fabric you want to delete. The API key needs to have Admin permission for that fabric.
//Connection
const client = new jsc8({
  url,
  apiKey,
  fabricName: fabricName,
});
//This function will delete all collections
const deleteAllCollections = async function () {
  try {
    const collections = await client.listCollections(true);
    for (let i of collections) {
      await client.deleteCollection(i.name);
    }
    console.log(`All collections are deleted`);
  } catch (e) {
    console.log(e);
    console.log("Something went wrong, Collections cant be deleted");
  }
};
//This function will delete all RESTqls.
const deleteAllRestqls = async function () {
  try {
    const listOfCreatedRestql = await client.getRestqls();
    for (let i of listOfCreatedRestql.result) {
      await client.deleteRestql(i.name);
    }
    console.log("All RESTqls are deleted");
  } catch (e) {
    console.log(e);
    console.log("Something went wrong, RESTqls cant be deleted");
  }
};

//For delete stream method driver version should be jsc8@0.17.6-beta.5
const deleteAllStreams = async function () {
  const streams = await client.getStreams();
  try {
    for (let i of streams.result) {
      await client.deleteStream(i.topic, true);
    }
    console.log("Streams are deleted");
  } catch (e) {
    console.log("Streams cant be deleted");
    console.log(e);
  }
};
//This function will delete all SW.
const deleteAllStreamWorkers = async function () {
  const streamapps = await client.retrieveStreamApp();
  //console.log(streamapps);
  for (let i of streamapps.streamApps) {
    console.log(i.name, i.regions);
  }
  try {
    for (let i of streamapps.streamApps) {
      await client.deleteStreamApp(i.name);
    }
    console.log("SteamWorkers are  deleted");
  } catch (e) {
    console.log(e.response.body.message);
    console.log("Something went wrong, StreamWorkers cant be deleted");
  }
};
//This function will delete all Views.
const deleteAllViews = async function () {
  const views = await client.getListOfViews();
  try {
    for (let i of views.result) {
      const data = await client.deleteView(i.name);
    }
    console.log("Views are deleted");
  } catch (e) {
    console.log(e);
    console.log("Something went wrong, Views cant be deleted");
  }
};
//This function will delete all GRAPHS
const deleteAllGraphs = async function () {
  const graphs = await client.getGraphs();
  try {
    for (let i of graphs) {
      await client.deleteGraph(i.name);
    }
    console.log("Graphs are deleted");
  } catch (e) {
    console.log(e);
    console.log("Something went wrong, Graphs cant be deleted");
  }
};

const runInSeries = async () => {
  const list = [
    deleteAllCollections,
    deleteAllRestqls,
    //deleteAllStreams,
    // deleteAllStreamWorkers,
    //deleteAllViews,
    deleteAllGraphs,
  ];
  for (const fn of list) {
    await fn(); // call function to get returned Promise
  }
};

runInSeries();
