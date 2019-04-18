// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
  Displays a notification with the current time. Requires "notifications"
  permission in the manifest file (or calling
  "Notification.requestPermission" beforehand).
*/

// описание глобальных параметров
var $lastTS = 0,
	$mailingEventsInterval = [],
	$activityInc = 0;

// Conditionally initialize the options.
if (!localStorage.isInitialized) {
  localStorage.userid = 0;   // The display activation.
  localStorage.isInitialized = true; // The option initialization.
}

chrome.runtime.onMessage.addListener(function(request) { if (request && (request.id == "setNotifications")) { setNotifications(); } });

// описание методов

// Получить timestamp(для определения интервалов)
function getTS(){
	// Получим с сервера
	if(!$lastTS){
		$.ajax({
			url:"https://tireos.info/_util/plug.php",
			method: "POST",
			data: {a:'getservertime'},
			success: function(result){
				$lastTS = parseInt(result);
			}
		})
	} else {
		$lastTS += 60000;
	}
}

// Получение количества непросмотренных сообщений
function getNewMsgData($result){
	
	// инициализация параметров
	if($result == 'Initialize'){
		$params = {
			count:'Y',
			a:'unreadmsg'
		};
		return $params;
	}
	
	// обработка результатов
	if(parseInt($result) > 0){
		/*chrome.browserAction.setIcon({
		  path : {
			"48": "ico2.png",
			"64": "ico2.png",
			"128": "ico2.png"
		  }
		});*/
		
		if($result < 10)
			chrome.browserAction.setBadgeText({text: ""+$result});
		else
			chrome.browserAction.setBadgeText({text: "10+"});
		chrome.browserAction.setTitle({title: "Задач с непросмотренными сообщениями: "+$result});
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

// Получение непросмотренных за последний период времени
function checkLastMessages($result){
	
	// инициализация параметров
	if($result == 'Initialize'){
		$params = {
			count:'Y',
			a:'unreadmsg',
			ts:$lastTS
		};
		return $params;
	}
	
	// обработка результатов
	if(parseInt($result) > 0){
		var date = new Date();
		new Notification('Новые сообщения', {
			body: 'У вас появились новые сообщения в задачах'
		});
		//getNewMsgData();
	}
	
}

// Задачи, недавно остановленные из-за нехватки баланса
function checkLastStoppedBalanceTasks($result){
	
	// инициализация параметров
	if($result == 'Initialize'){
		$params = {
			a:'checkoutofbalancenotice',
			from:$lastTS
		};
		return $params;
	}
	
	// обработка результатов
	if($result.length > 0){
		for(k in $result){
			
			chrome.notifications.create("", {
				type: "basic",
				title: "Уведомление о балансе",
				message: "Баланс по задаче `" + $result[k]['TITLE'] + "[" + $result[k]['ID'] + "]` истек. Ожидайте пополнения.",
				iconUrl: "excl.jpg"
			});
			
		}
	}
	
}

// Проверка наличия новых системных уведомлений(объявления о событиях/рассылка)
function getMailingEvents($result){
	
	// инициализация параметров
	if($result == 'Initialize'){
		$params = {
			a:'checkmailingevents',
			updatelastactivity:'Y'
		};
		return $params;
	}
	
	// обработка результатов
	if($result.ITEMS.length){
		for(k in $result.ITEMS){
			
			var $element = $result.ITEMS[k],
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

// проверка активности
function getActivityStatus($result){

	// инициализация параметров
	if($result == 'Initialize'){
		$params = {
			a:'checkactivity'
		};
		return $params;
	}
	
	// обработка результатов
	var $active = ($result=='Y');
	
	if($active)
		$activityInc = 0;
	else
		$activityInc++;
	
	$ico = $active ? "ico2.png" : "ico.png";
	console.log('Activity:' + $ico);
	chrome.browserAction.setIcon({
	  path : {
		"48": $ico,
		"64": $ico,
		"128": $ico
	  }
	});
	
	// каждые 10 минут простоя уведомляем о неактивности
	if($activityInc > 10){
		
		var date = new Date();
		new Notification(date.getHours() + ':' + date.getMinutes(), {
			body: 'Нет активных задач'
		});
		
		$activityInc = 0;
		
	}
	
}

// проверка уведомлений о простое
function checkRemindMsg($result){

	// инициализация параметров
	if($result == 'Initialize'){
		$params = {
			a:'getremind',
		};
		return $params;
	}
	
	if($result.length > 0){
		
		var date = new Date();
		new Notification(date.getHours() + ':' + date.getMinutes(), {
			body: 'Включи счетчик!'
		});
		
	}
	
}

// Мультизапрос
function multiRequest($funcList){
	
	if(
		typeof($funcList) === 'undefined' ||
		$funcList.length <= 0
	)
		return;
	
	// собираем параметры
	$paramsList = [];
	
	for($k in $funcList){
		
		$funcName = $funcList[$k];
		
		if( typeof( window[$funcName] ) === 'function' ){
			
			$paramIncArr = window[$funcName]('Initialize');
			$paramIncArr['returnFunction'] = $funcName;
			
			$paramsList.push( $paramIncArr );
			
		}
		
	}
	
	// выполняем отправку
	if($paramsList.length > 0){
		
		$data = {
			a:'getcomplex',
			requestVersion: 2,
			methods:$paramsList
		};
		
		$.ajax({
			url:"https://tireos.info/_util/plug.php",
			method: "POST",
			dataType: "json",
			data: $data,
			success: function($result){
				
				// Выполняем обработку полученных данных
				for($k in $result){
					
					window[$k]($result[$k]);
					
				}
				
			}
		});
	
	}
	
}

// Обработка всех видов уведомлений
function setNotifications() {
    if (window.Notification) {
		
		multiRequest([
			'getActivityStatus',
			'getNewMsgData'
		]);
		
		// Получить последний timestamp с сервера
		getTS();
  		setInterval(function() {
			
			multiRequest([
				'getActivityStatus',
				'getNewMsgData',
				'checkLastMessages',
				'checkLastStoppedBalanceTasks',
				'checkRemindMsg'
			]);
			
			// обновить timestamp
			getTS();
			
		}, 60000);
		
		// Проверка наличия новых системных уведомлений(объявления о событиях/рассылка)
  		/*setInterval(function() {
			
			multiRequest([
				'getMailingEvents'
			]);
			
		}, 60000);*/
		
    }
}

setNotifications();
