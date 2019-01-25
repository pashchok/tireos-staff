// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
  Displays a notification with the current time. Requires "notifications"
  permission in the manifest file (or calling
  "Notification.requestPermission" beforehand).
*/
var $lastTS = 0,
	$mailingEventsInterval = [];

function show() {
  var date = new Date();     // The prettyprinted time.
  new Notification(date.getHours() + ':' + date.getMinutes(), {
    body: 'Нет активных задач'
  });
}

// Conditionally initialize the options.
if (!localStorage.isInitialized) {
  localStorage.userid = 0;   // The display activation.
  localStorage.isInitialized = true; // The option initialization.
}

chrome.runtime.onMessage.addListener(function(request) { if (request && (request.id == "setNotifications")) { setNotifications(); } });

function getNewMsgData(){
	$.ajax({
		url:"https://tireos.info/_util/plug.php",
		method: "POST",
		dataType: 'JSON',
		data: {count:'Y',a:'unreadmsg'},
		success: function(result){
			if(parseInt(result) > 0){
				/*chrome.browserAction.setIcon({
				  path : {
					"48": "ico2.png",
					"64": "ico2.png",
					"128": "ico2.png"
				  }
				});*/
				
				if(result < 10)
					chrome.browserAction.setBadgeText({text: ""+result});
				else
					chrome.browserAction.setBadgeText({text: "10+"});
				chrome.browserAction.setTitle({title: "Задач с непросмотренными сообщениями: "+result});
			}else{
				/*chrome.browserAction.setIcon({
				  path : {
					"48": "ico.png",
					"64": "ico.png",
					"128": "ico.png"
				  }
				});*/					
				chrome.browserAction.setBadgeText({text: ""});
				chrome.browserAction.setTitle({title: "Текущие задачи"});
			}
		}
	})	
}

// Получение непросмотренных за последний период времени
function checkLastMessages(){
	if(!$lastTS)
		return;
	$.ajax({
		url:"https://tireos.info/_util/plug.php",
		method: "POST",
		dataType: 'JSON',
		data: {count:'Y',a:'unreadmsg',ts:$lastTS},
		success: function(result){
			if(parseInt(result) > 0){
				var date = new Date();
				new Notification('Новые сообщения', {
					body: 'У вас появились новые сообщения в задачах'
				});
				getNewMsgData();
			}
		}
	})
}

function checkLastStoppedBalanceTasks(){
	if(!$lastTS)
		return;
	// Задачи, недавно остановленные из-за нехватки баланса
	$.ajax({
		url:"https://tireos.info/_util/plug.php",
		method: "POST",
		dataType: 'JSON',
		data: {a:'checkoutofbalancenotice',from:$lastTS},
		success: function(result){
			if(result.length > 0){
				for(k in result){
					
					chrome.notifications.create("", {
						type: "basic",
						title: "Уведомление о балансе",
						message: "Баланс по задаче `" + result[k]['TITLE'] + "[" + result[k]['ID'] + "]` истек. Ожидайте пополнения.",
						iconUrl: "excl.jpg"
					});
					
				}
			}
		}
	})
	
}

// Получить timestamp(для определения интервалов)
function getTS(){
	// Получим с сервера, и пофиг
	if(!$lastTS){
		$.ajax({
			url:"https://tireos.info/_util/plug.php",
			method: "POST",
			data: {a:'getservertime'},
			dataType: 'JSON',
			success: function(result){
				$lastTS = parseInt(result);
			}
		})
	} else {
		$lastTS += 20000;
	}
	
	//return $.now();
}

// Проверка наличия новых системных уведомлений(объявления о событиях/рассылка)
function getMailingEvents(){
	$.ajax({
		url:"https://tireos.info/_util/plug.php",
		method: "POST",
		data: {a:'checkmailingevents',updatelastactivity:'Y'},
		dataType: 'JSON',
		success: function(result){
			if(result.ITEMS.length){
				for(k in result.ITEMS){
					
					var $element = result.ITEMS[k],
						$icon = "excl.jpg";
					
					if($element.ID){
						if($mailingEventsInterval[$element.ID])
							continue;
						$mailingEventsInterval[$element.ID] = true;
					}
					
					switch($element.TYPE){
						case 'BIRTHDAY':
							$icon = "birthday.jpg";
							break;
						default:
							break;
					}
					
					chrome.notifications.create("", {
						type: "basic",
						title: "Служба уведомлений",
						message: $element.DETAIL_TEXT,
						iconUrl: $icon,
						requireInteraction: true
					});
					
				}
			}
		}
	})
	
}
  
function getActivityStatus(){

	$.ajax({
		url:"https://tireos.info/_util/plug.php",
		method: "POST",
		data: {a:'checkactivity'},
		dataType: 'JSON',
		success: function(result){
			
			$ico = (result=='Y') ? "ico2.png" : "ico.png";
			chrome.browserAction.setIcon({
			  path : {
				"48": $ico,
				"64": $ico,
				"128": $ico
			  }
			});
			
		}
	})
	
}
  
// Обработка всех видов уведомлений
function setNotifications() {
    if (window.Notification) {
		
		getActivityStatus();
		
		// Уведомление об отсутствии активных задач
        setInterval(function() {
            $.getJSON( "https://tireos.info/staff.info.php?task=getRunTask&userid=" + localStorage.userid, function( data ) {
                if ( data != true ) { show(); }
            });
        }, 600000);
		
		// Получение информации о непросмотренных сообщениях
		setInterval(function() {
			getNewMsgData();
			getActivityStatus();
		}, 60000);
		getNewMsgData();
		
		getTS();
  		setInterval(function() {
			// Проверка появления нового сообщения
			checkLastMessages();
			// Проверка истечения баланса задачи
			checkLastStoppedBalanceTasks();
			getTS();
		}, 60000);
		
		// Проверка наличия новых системных уведомлений(объявления о событиях/рассылка)
  		/*setInterval(function() {
			getMailingEvents();
		}, 60000);*/
		
    }
}

setNotifications();
