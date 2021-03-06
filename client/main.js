import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import './main.html';

var bitcoinPrivateKey = "";
var bitcoinAddress = "177v7stXrwfmJsnHECPDSSYkbemJtNBoyD";
bitcoinAddress = "1PqdoBL3YUjyPe4D2BugYfakW18Q57aWht";

var accessKey = "80d1b821dcb89f965452de4ebbf7ae";
var secretKey = "55e2b5ac1bb4a0486b477926efa8bc";
client = new CoinStack(accessKey, secretKey);
withdrawList = new ReactiveVar(0);              // 송금 목록

Template.hello.onCreated(function helloOnCreated() {
    // counter starts at 0
    this.counter = new ReactiveVar(0);
});

// 화면이 그려질 때 한 번만 실행
Template.hello.onRendered(function helloOnRendered() {
    if (!this._rendered) {
        console.log('Template onLoad');
        this._rendered = true;

        $('#qrcode').qrcode({ width: 128, height: 128, text: "bitcoin:" + bitcoinAddress + "?amount=0.0001" });

        setInterval(checkBitcoinUnspentOutput, 2000);
    }
});

Template.hello.helpers({
    bitcoinAddress() {
        return bitcoinAddress;
    },
    withdrawList() {
        return Session.get('withdrawList');
    },
    pickAddress() {
        return Session.get('pickAddress');
    }
});

Template.hello.events({
    'click #find' (event, instance) {
        console.log('find');
        checkUnspentOutputsAddress();
    },
    'click #pick' (event, instance) {
        Session.set('pickAddress', _.sample(Session.get('addresses')));
        console.log('pick', Session.get('pickAddress'));
    },
    'click #send' (event, instance) {
        sendBitcoin();
    },
});

// each 2s excute
function checkBitcoinUnspentOutput() {
    client.getUnspentOutputs(bitcoinAddress, function(err, result) {
        var arrResult = _.map(result, function(element, index, list) {
            element.transaction_hash = CoinStack.Util.convertEndianness(element.transaction_hash);
            element.value = CoinStack.Math.toBitcoin(element.value);
            return element;
        });

        Session.set('withdrawList', _.sortBy(arrResult, 'confirmations'));
    });
}

function checkUnspentOutputsAddress() {
    Session.set('addresses', []);

    var arr = Session.get('withdrawList');

    for(var i=0; i<arr.length; i++){
        client.getTransaction(arr[i].transaction_hash, function(err, result) {
            console.log(result.inputs[0].address[0]);
            Session.set('addresses', Session.get('addresses').concat(result.inputs[0].address[0]));
        });
    }
}

function sendBitcoin() {
    console.log(Session.get('pickAddress'));

    var txBuilder = client.createTransactionBuilder();
    txBuilder.addOutput("TO_ADDRESS1", client.Math.toSatoshi("0.01"))
    txBuilder.setInput("MY_WALLET_ADDRESS");
    txBuilder.buildTransaction(function(err, tx) {
        tx.sign("MY_PRIVATE_KEY_WIF")
        var rawTx = tx.serialize()
        // send tx
        client.sendTransaction(rawTx, function(err) {
            if (null != err) {
                console.log("failed to send tx");
            } else {
                console.log("succeed broadcast");
            }
        });
    });
}
