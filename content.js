var $timer,
	$dltimer = false,
	$lastSrch = "",
	$msgTimer,
	$siteList,
	$curWIndex = 0,
	$currentVersion = false;

loadScript();
function loadScript() {
	clearInterval($timer);
	if (typeof jQuery !== 'undefined') {
		var $srch = $('#content .search .sinput input').val();
		if($srch==undefined)
			$srch = "";
		$.getJSON( "http://tireos.info/staff.info.php?task=getTasks&userid=" + localStorage.userid + "&search="+$srch, function( data ) {
			$('#jsStaff tbody').html('');
			
			if(data.length){
				var tbody = '';
				//tbody += '<tr><td colspan="5" class="search"><input type="text" placeholder="Введите имя задачи для поиска" value="'+data[0].TOTAL.SEARCH+'"></td></tr>';
				$.each( data, function( key, val ) {
					var active = ( val.RUN === true ) ? ' active' : '',
						emptybalance = ( val.BALANCE_EMPTY == true ) ? ' emptybalance' : '';
					var task = ( val.TITLE != false && val.TITLE != undefined ) ? '<a href="http://tireos.info/company/personal/user/' + val.USER_ID + '/tasks/task/view/' + val.TASK_ID + '/" target="_blank">' + val.TITLE + '</a>' : '';
					var time;
					if(active)
						var $activeTime = parseInt(val.RUN_TIME) + parseInt(val.CURRENT_LENGTH);
					//if ( val.RUN_TIME != false && val.RUN_TIME != undefined ) {
						time = timeFormat(Number(active ? $activeTime : val.RUN_TIME)*1000);
					//} else {
					//	val.RUN_TIME = 0;
					//	time = '';
					//}
					
					// Если активно - запускаем таймер
					if(active){
						var $activeTask = val.TASK_ID;
						$timer = setInterval(function(){
							$activeTime++;
							$('#taskTimer'+$activeTask).html(timeFormat(Number($activeTime)*1000));
						},1000);
					}
					tbody += '<tr class="' + active + emptybalance + '"'+ (val.BALANCE_EMPTY ? ' title="Баланс требует пополнения, нельзя продолжить"' : '') +'>' +
								( (val.NO_RUN || val.BALANCE_EMPTY) ? '<td></td>' : '<td class="play"><i class="fa '+(active?'fa-pause':'fa-play')+' playbtn" data-task="'+val.TASK_ID+'" data-user="'+val.USER_ID+'" data-action="'+(active?'stop':'start')+'"></i></td>') +
								'<td class="name">' + val.SITE + '</td>' +
								'<td class="task">' + task + ' ['+val.TASK_ID+']</td>' +
								'<td class="time" id="taskTimer'+val.TASK_ID+'">' + (time?time:'00:00:00') + '</td>' +
							  '</tr>';
				});
				var $remain = data[0].TOTAL.TIMEFULL ? '' : ', осталось: '+data[0].TOTAL.REMAIN+'ч';
				tbody += '<tr><td colspan="5" class="result'+(data[0].TOTAL.TIMEFULL?' full':'')+'">Наработано: '+data[0].TOTAL.TIME+'ч'+$remain+'</td></tr>';
			}else{
				tbody += '<tr><td class="empty">Ничего не найдено</td></tr>';
			}
			
			$('#jsStaff').html(tbody);
			addPlayOptions();
			$('body').addClass('showed');
			
			// Сравнение версий
			if(!$currentVersion){
				var loc = window.location,
					relativePath = loc.href.substring(0, loc.href.lastIndexOf('/') + 1);
				$.ajax({
					url: relativePath+'version.txt',
					error: function(){},
					success: function(result){
						if(result){
							$currentVersion = result;
							// Получаем текущую версию на сервере
							getRemoteVersion();
						}
					}
				})
			}
		});
	}
}

function getRemoteVersion(){
	$.ajax({
		url: 'https://tireos.net/_util/get.php',
		data: {a:'getlibver',id:267},
		type: 'POST',
		error: function(){},
		success: function(result){
			if(
				result &&
				$currentVersion &&
				($currentVersion != result)
			){
				// Высвечиваем сообщение о несовпадении версий
				$('#jsSearchBlock').after($('<div class="s-plug-warning">Ваш плагин устарел. Пожалуйста, загрузите<br />последнюю версию'+
											' с сайта <a href="https://tireos.net/tslibrary/phplib/" target="_blank">tireos.net</a></div>'));
			}
		}
	})
}

function addPlayOptions(){
	$('table#jsStaff .playbtn').on('click',function(){
		var $task = $(this).data('task');
		var $user = $(this).data('user');
		var $action = $(this).data('action');
		$(this).addClass('wait');
		$.ajax({
			url: "http://tireos.info/task.control.php?task="+$task+"&user="+$user+"&action="+$action
		}).done(function(result){
			loadScript();
		})
	})
}

function loadSearch(){
	$('#content .search .sinput input').on('keyup',function(e){
		var $currentSrch = $('#content .search .sinput input').val();
		if ($lastSrch != $currentSrch) {
			if($dltimer)
				clearTimeout($dltimer);
			$dltimer = setTimeout(function(){
				loadScript();
				$lastSrch = $currentSrch;
				$dltimer = false;
			},500);
		}
	})
}

function loadAddTaskMenu(){
	$('#content .search .addbtn').on('click',function(){
		$(this).next().toggleClass('opened').find('.namefld').focus();
	})
	$('#content .search .addform').on('submit',function(){
		var $this = $(this);
		var $data = $this.serializeObject();
		
		var $check = checkFormVals($this);
				
		if(!$check)
			return false;
		
		$data.time = $this.find('input.timefld').data('time');
		
		$.ajax({
			url:"http://tireos.info/bitrix/templates/bitrix24/components/bitrix/news.list/taskview/add.php",
			data: $data,
			method: "POST",
			dataType: "json"
		}).done(function(result){
			if(result.ID){
				$this.removeClass('opened');
				$this[0].reset();
				makeMsg('Время по задаче добавлено');
			}else{
				alert('Не удалось создать задачу');
			}
		})
		return false;
	})
	// Получаем список сайтов
	$.ajax({
		url:"http://tireos.info/tctrl/site.list.php",
		dataType: "json"
	}).done(function(result){
		$siteList = result;
		/*$('#content .search .addform .sitefld option').each(function(){
			if($(this).val())
				$(this).remove();
		})
		for(k in result){
			var $gname = result[k];
			$('#content .search .addform .sitefld').append('<option value="'+$gname+'">'+$gname+'</option>');
		}*/
		loadFinder($('#sitefld'),$('#sitelist'),$siteList);
	})

	$(document).click(function(event) {
		// Прячем поле формы при клике вне области
		if(
			!$(event.target).closest('#content .search .addform').length &&
			!$(event.target).closest('#content .search .addbtn').length &&
			!$('#ui-datepicker-div').is(':visible')
		) {
			$( "#content .search .addform").removeClass('opened');
		}        
	})

	$.datepicker.regional['ru'] = {
		closeText: 'Закрыть',
		prevText: '&#x3c;Пред',
		nextText: 'След&#x3e;',
		currentText: 'Сегодня',
		monthNames: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
		'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
		monthNamesShort: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
		'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
		dayNames: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
		dayNamesShort: ['вск', 'пнд', 'втр', 'срд', 'чтв', 'птн', 'сбт'],
		dayNamesMin: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
		weekHeader: 'Нед',
		dateFormat: 'dd.mm.yy',
		firstDay: 1,
		isRTL: false,
		showMonthAfterYear: false,
		yearSuffix: ''
	};
	$.datepicker.setDefaults($.datepicker.regional['ru']);
	$( "#content .search .addform .datefld" ).datepicker({ dateFormat: "dd.mm.yy" });
	$( "#content .search .addform .timefld" ).inputmask('99.99',{ "clearIncomplete": true }).on('change',function(){
		var $curVal = 0;
		if($(this).val())
			$curVal = parseFloat($(this).val());
		var $hours = Math.floor($curVal);
		var $minutes = parseFloat($curVal - $hours);
		var $part = $minutes*100/60;
		var $resultTime = $hours + $part;
		$(this).data('time',$resultTime);
		
		var $newHours = Math.floor($resultTime);
		var $newMinutes = ($resultTime - $newHours)*60/100;
		var $newTime = $newHours+'.'+$newMinutes;
	});
	
	// Триггерим скрытие поверхностных объектов
	$(document).on( 'keydown', function (e) {
		if ( e.which == 27 ) { // ESC
			var $maxwindex = 0,$maxwindexItem = false;
			$('*[data-windex]').each(function(){
				var $windex = $(this).data('windex');
				if($(this).is(":visible") && $maxwindex < $windex){
					$maxwindexItem = $(this);
					$maxwindex = $windex;
				}
			})
			if($maxwindexItem){
				$maxwindexItem.trigger('onescape');
				return false;
			}
		}
	});
	
	$('#content .addform').on('onescape',function(){
		$(this).removeClass('opened');
	})
	
	$('#content .sitefld').on('valchange',function(){
		$('#content .timefld').focus();
	})
	
	// Обработчик табов
	makeTabs();
	
	// Грузим новые сообщения
	loadNewMessages();
}

function loadNewMessages($page){
	if(typeof($page)==='undefined' || !$page)
		$page = 1;
	$.ajax({
		url:"http://tireos.info/_util/plug.php",
		method: "POST",
		dataType: "json",
		data: {PAGE:$page,a:'unreadmsg'}
	}).done(function(result){
		if(!result.ITEMS || !result.ITEMS.length)
			return;
		$('#jsUnreadTasks tbody').html('');
		for(k in result.ITEMS){
			var $addRow = $('<tr>'+
							  '<td>'+result.ITEMS[k].ID+'</td>'+
							  '<td><a target="_blank" href="http://tireos.info/company/personal/user/'+result.USER_ID+'/tasks/task/view/'+result.ITEMS[k].ID+'/">'+result.ITEMS[k].TITLE+'</a> ('+result.ITEMS[k].CNT+')</td>'+
							  '<td>'+result.ITEMS[k].POST_DATE_SHORT+'</td>'+
							'</tr>');
			$('#jsUnreadTasks tbody').append($addRow);
		}
		if(result.PAGES > 1){
			var $paging = $('<tr>'+
								'<td colspan="3">'+
									'<div class="s-plug-paging"></div>'+
								'</td>'+
							'</tr>');
			$('#jsUnreadTasks tbody').append($paging);
			for(j=1;j<=result.PAGES;j++){
				if(j == $page){
					var $newPage = $('<span>'+j+'</span>');
				}else{
					var $newPage = $('<a href="#" data-page="'+j+'">'+j+'</a>');
					$newPage.on('click',function(){
						loadNewMessages($(this).data('page'));
					})
				}
				$('#jsUnreadTasks .s-plug-paging').append($newPage);
			}
		}
	})
	
}

function makeTabs(){
	$('.s-plug-tabs > div').on('click',function(){
		var $ind = $(this).index(),
			$p = $(this).closest('.s-plug-tabs'),
			$tar = $($p.data('for'));
		if($tar.length){
			$tar.find('>div').eq($ind).show().siblings().hide();
			$(this).addClass('active').siblings().removeClass('active');
		}
	})
}

function loadFinder($field,$list,$itemsForSearch){
	// Поиск по сайту
	var $sendKey = false;
	$field.on('keyup',function(e){
		if(e.which==27)
			return;
		if($sendKey){
			$sendKey = false;
			return;
		}
		var $searchFld = $(this);
		var $findedItems = [];
		var $searchVal = $(this).val();
		for(k in $itemsForSearch){
			if($itemsForSearch[k].toLowerCase().indexOf($searchVal)>=0)
				$findedItems.push($itemsForSearch[k]);
		}
		$list.html('');
		for(k in $findedItems){
			$list.append('<div tabindex="1">'+$findedItems[k]+'</div>');
		}
		if($findedItems.length)
			$list.show();
		else
			$list.hide();
		$list.find('>div').on('keydown',function(evt){
			var $index = parseInt($(this).index());
			var $nextIndex = $index+1;
			var $prevIndex = $index-1;
			if(evt.which==40 && $index < $(this).siblings().length){ // down
				$list.find('>div:eq('+$nextIndex+')').focus();
			}else if(evt.which==38 && $index > 0){ // up
				$list.find('>div:eq('+$prevIndex+')').focus();
			}else if(evt.which==13){ // enter
				$(this).trigger('click');
				$searchFld.trigger('valchange');
				$sendKey = true;
				evt.stopPropagation();
				evt.preventDefault();
			}else if(evt.which==27){ // escape
				$searchFld.trigger('clrfield').focus();
				return false;
			}
		}).on('click',function(){
			var $curVal = $(this).html();
			$searchFld.val($curVal).data('val',$curVal);
			$list.html('').hide();
			return false;
		})
	}).on('keydown',function(e){
		if(e.which==40){
			$list.find('>div:eq(0)').focus();
		}else if(e.which==27){ // escape
			$(this).trigger('clrfield');
			return false;
		}
	}).on('clrfield',function(){
		$list.html('').hide();
		$(this).val($(this).data('val'));
	})
	$(document).click(function(event) {
		// Прячем поле списка при клике вне области
		var $target = $(event.target);
		if(
			!$.contains($target,$list) &&
			!($target.is($list)) &&
			!$.contains($target,$field) &&
			!($target.is($field))
		) {
			$field.trigger('clrfield');
		}
	})
}

function makeMsg(txt){
	$('#addTimeSuccess').html(txt).addClass('showed');
	if($msgTimer)
		clearTimeout($msgTimer);
	$msgTimer = setTimeout(function(){
		$('#addTimeSuccess').removeClass('showed');
	},3000);
}

// Проверка заполнения обязательных полей
function checkFormVals($form){
	$ok = true;
	$form.find('input.req').each(function(){
		if(!$(this).val()){
			$(this).addClass('err');
			$ok = false;
		}else{
			$(this).removeClass('err');
		}
	})
	$form.find('select.req').each(function(){
		if(!$(this).val()){
			$(this).addClass('err');
			$ok = false;
		}else{
			$(this).removeClass('err');
		}
	})
	return $ok;
}

if (typeof jQuery !== 'undefined') {
	$(function(){
		loadSearch();
		loadAddTaskMenu();
	})
}

//var notification = webkitNotifications.createHTMLNotification( 'notification.html' );

//notification.show();

var timeFormat = (function (){
    function num(val){
        val = Math.floor(val);
        return val < 10 ? '0' + val : val;
    }

    return function (ms){
        var sec = ms / 1000
          , hours = sec / 3600//  % 24
          , minutes = sec / 60 % 60
          , seconds = sec % 60
        ;

        return num(hours) + ":" + num(minutes) + ":" + num(seconds);
    };
})();

if (typeof jQuery !== 'undefined') {
	$.fn.serializeObject = function()
	{
		var o = {};
		var a = this.serializeArray();
		$.each(a, function() {
			if (o[this.name] !== undefined) {
				if (!o[this.name].push) {
					o[this.name] = [o[this.name]];
				}
				o[this.name].push(this.value || '');
			} else {
				o[this.name] = this.value || '';
			}
		});
		return o;
	};
}