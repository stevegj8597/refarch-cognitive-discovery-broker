const cfenv = require('cfenv');
const DiscoveryV1 = require('watson-developer-cloud/discovery/v1');
const extend = require('extend');

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();
var config = require('../env.json');

var discConfig = extend(config.discovery, vcapServices.getCredentials('discovery'));
var discovery = new DiscoveryV1({
  username: discConfig.username,
  password: discConfig.password,
  version_date: discConfig.version_date
});

app.get('/api/all', function(req, res) {
	discovery.query({
    environment_id: discConfig.environment_id,
    collection_id: discConfig.collection_id
  }, function(err, response) {
        if (err) {
          console.error(err);
        } else {
          res.json(response);
        }
   });
});

app.post('/api/company/product', function(req, res) {
	var productQuery;
	var companyQuery;

	if (req.body.product) productQuery = req.body.product + ",language:english";
	else  productQuery = "language:english";
	if (req.body.company) companyQuery = "blekko.urlrank>1,blekko.chrondate>1482901200,blekko.chrondate<1488258000,enrichedTitle.entities.text:" + req.body.company;
	else companyQuery = "blekko.urlrank>1,blekko.chrondate>1482901200,blekko.chrondate<1488258000"

	discovery.query({
    environment_id: "ee16acaa-19cb-412a-b0e4-cfcb21989805",
    collection_id: "0b0bfb4b-1a9f-4f63-99f9-d1816759c9ef",
    count: "5",
    query: productQuery,
    filter: companyQuery,
    return: "title,docSentiment,enrichedTitle.text,url,host,enrichedTitle.entities.text",
    aggregation: [
    "nested(enrichedTitle.entities).filter(enrichedTitle.entities.type:Company).term(enrichedTitle.entities.text)",
    "nested(enrichedTitle.entities).filter(enrichedTitle.entities.type:Person).term(enrichedTitle.entities.text)",
    "term(enrichedTitle.concepts.text)",
    "term(blekko.basedomain).term(docSentiment.type)",
    "term(docSentiment.type)",
    "min(docSentiment.score)",
    "max(docSentiment.score)",
    "filter(enrichedTitle.entities.type::Company).term(enrichedTitle.entities.text).timeslice(blekko.chrondate,1day).term(docSentiment.type)"
  ]
  }, function(err, response) {
        if (err) {
          console.error(err);
        } else {
        	var returnJSON = [];
        	async.forEach(response.results, function(result, callback) {
        		returnEntities = [];
          		async.forEach(result.enrichedTitle.entities, function(entity, callback) {
          			returnEntities.push(entity.text);
          			callback();
          		}, function(err) {
          			returnJSON.push({score: result.score, url: result.url, title: result.title,sentiment:result.docSentiment.score, entities: returnEntities});
          			callback();
          		});
          	}, function(err) {
          		res.json(returnJSON);
        	});
        }
   });
});
