/**
 * Created by Derek Rada on 9/9/2014.
 */


var AWS = require("aws-sdk");
var config = require("../config.json");

AWS.config.update(config.aws);

var route53 = new AWS.Route53();



exports.routeHandler = function routeHandler(req, res) {

    var params = req.params;
    params.ip = req.ip;

    if (!params.zone || !params.record) {
        res.json({ success: false, message: "No Hosted Zones Found"});
        return;
    }

    route53.listHostedZones({ MaxItems: "25" }, function (err, data) {
        if (err) {
            res.write(err);
            res.write(err.stack);
            res.end();
        }
        else {
            if (data && data.HostedZones && data.HostedZones.length > 0) {
                getHostedResources(params, data, function (response) {
                    res.json(response);
                });
            } else {
                res.json({ success: false, message: "No Hosted Zones Found"});
            }
        }
    });

};


function getHostedResources(params, data, cb) {

    var hostedZones = data.HostedZones;
    var found = false;
    for (var i = 0; i < hostedZones.length; i++) {

        if (hostedZones[i].Name && hostedZones[i].Name.indexOf(params.zone) >= 0) {

            retreiveHostedResources(params.ip, params.record, hostedZones[i], cb);
            i = hostedZones.length;
            found = true;
        }
    }
    if (found === false) {
        cb({ success: false, message: "No Hosted Zone matched"});
    }
}

function retreiveHostedResources(ip, record, zone, cb) {

    var zone = zone;
    var record = record;
    var ip = ip;
    console.log(zone);

    route53.listResourceRecordSets(
        {
            HostedZoneId: zone.Id

        }, function (err, data) {

           if (err) {
               console.log(err, err.stack);
               cb({ success: false, message: "Unknown error"});
           } else {
                getRecordSets(ip, zone, record, data, cb);
           }

    });
};

function getRecordSets(ip, zone, record, data, cb) {

    var zone = zone;
    var record = record;
    var records = data.ResourceRecordSets;
    var name = record.toLowerCase() + "." + zone.Name.toLowerCase();
    var ip = ip;
    var found = false;

    console.log("Name: " + name);

    for (var i = 0; i < records.length; i++) {

        if (records[i].Name.indexOf(name) >= 0) {
            console.log(records[i]);
            setZoneRecord(ip, zone, records[i], cb);
            // cb(records[i]);
            found = true;
            i = records.length;
        }
    }
    if (found == false) {
        cb({ success: false, message: "No record set found"});
    }
}

var changeparams = {
    ChangeBatch: { /* required */
        Changes: [ /* required */
            {
                Action: 'CREATE | DELETE | UPSERT', /* required */
                ResourceRecordSet: { /* required */
                    Name: 'STRING_VALUE', /* required */
                    Type: 'SOA | A | TXT | NS | CNAME | MX | PTR | SRV | SPF | AAAA', /* required */
                    AliasTarget: {
                        DNSName: 'STRING_VALUE', /* required */
                        EvaluateTargetHealth: true || false, /* required */
                        HostedZoneId: 'STRING_VALUE' /* required */
                    },
                    Failover: 'PRIMARY | SECONDARY',
                    GeoLocation: {
                        ContinentCode: 'STRING_VALUE',
                        CountryCode: 'STRING_VALUE',
                        SubdivisionCode: 'STRING_VALUE'
                    },
                    HealthCheckId: 'STRING_VALUE',
                    Region: 'us-east-1 | us-west-1 | us-west-2 | eu-west-1 | ap-southeast-1 | ap-southeast-2 | ap-northeast-1 | sa-east-1 | cn-north-1',
                    ResourceRecords: [
                        {
                            Value: 'STRING_VALUE' /* required */
                        },
                        /* more items */
                    ],
                    SetIdentifier: 'STRING_VALUE',
                    TTL: 0,
                    Weight: 0
                }
            } //,
            /* more items */
        ],
        Comment: 'STRING_VALUE'
    },
    HostedZoneId: 'STRING_VALUE' /* required */
};

function setZoneRecord(ip, zone, record, cb) {

    console.log(ip + " " + JSON.stringify(record));

    if (checkIp(ip, record)) {
        cb({ success: true, message: "No changes needed"});
        return;
    } else {

        // return;
    }

    var setParams = {

        ChangeBatch: {
            Changes: [
                {
                    Action: 'UPSERT', /* required */
                    ResourceRecordSet: record
                }
            ],
            Comment: "Dynamic53 - automated request - " + new Date().toLocaleDateString()
        },
        HostedZoneId: zone.Id
    };

    console.log(JSON.stringify(setParams));

    route53.changeResourceRecordSets(setParams, function (err, data) {
      if (err) { console.log(err, err.stack); cb({ success: false, message: "Unknown error"});}
      else {
          console.log(data);
          cb({ success: true, message: "Changes made successfully"});
      }
    });
}

function checkIp(ip, record) {

    if (record.ResourceRecords && record.ResourceRecords.length && record.ResourceRecords.length > 0) {

        if (record.ResourceRecords[0].Value == ip)
        {
            return true;
        } else {
            return false;
        }
    } else {

        return true;
    }


}