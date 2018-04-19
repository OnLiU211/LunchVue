/**
 * LunchVue Client Library v0.1.15 (https://github.com/Kurosnape/LunchVue/)
 * Copyright 2018 LunchVue Authors
 * Licensed under MIT (https://github.com/Kurosnape/LunchVue/blob/master/LICENSE)
 */
class LunchVue {
  constructor() {
    this.initVariables()
    this.bindEvents()
  }

  /**
   * 런치뷰에서 사용할 모든 변수를 초기화합니다.
   * DOM을 다룰 변수는 앞에 $를 붙입니다.
   * 
   * @class LunchVue
   * @method initVariables
   */
  initVariables() {
    this.date = new Date()
    this.time = this.date.getHours() <= 8 ? 'breakfast' : this.date.getHours() >= 9 && this.date.getHours() <= 14 ? 'lunch' : 'dinner'
    this.temp = {}
    this.temp.date = this.date
    this.meals = {}
    this.meals.prev = null
    this.meals.current = null
    this.meals.next = null
    this.schoolId = null
    this.schoolName = null
    this.schoolDomain = null
    this.haveSchoolId = false
    this.haveSchoolMeals = false
    this.checkStorage()

    this.$header = $('.header-title h1')
    this.$schoolName = $('.footer-title .title')
    this.$schoolDate = $('.footer-meta .date')
    this.$prevBtn = $('.footer-meta .prev')
    this.$nextBtn = $('.footer-meta .next')
    this.$searchForm = $('#searchForm')
    this.$searchSchoolInput = $('#searchSchoolInput')
    this.$searchResult = $('#searchResult')
    this.$mealResult = $('#mealResult')
    this.$device = $('#device')
    this.$result = $('#mealResult')

    this.$list = $('.nav li')
    $(`.nav li[data-type=${ this.time }]`).addClass('active')
    //console.log(this.$list.data('type', this.time), this.time)
    if (this.haveSchoolMeals && this.haveSchoolId) {
      this.$device.css('display', 'flex')
      this.$schoolName.html(this.schoolName)
      this.$schoolDate.html(this.calcDate(this.date))
      this.printMeals()
    } else if (this.haveSchoolId) {
      const query = {
        code: this.schoolId,
        name: this.schoolName,
        domain: this.schoolDomain
      }
      this.setSchool(query)
    } else {
      this.appendSearchModal()
    }
  }

  /**
   * 클라이언트 로컬 저장소에 값이 있는지 확인합니다.
   * 
   * @class LunchVue
   * @method checkStorage
   */
  checkStorage() {
    if (!!localStorage[`schoolId`]) {
      this.haveSchoolId = true
      this.schoolId = localStorage[`schoolId`]
      this.schoolName = localStorage[`schoolName`]
      this.schoolDomain = localStorage[`schoolDomain`]

      if (!!localStorage[`schoolMeals_${this.schoolId}_${this.zeroFill(this.date.getMonth() + 1)}`]) {
        this.haveSchoolMeals = true
        this.meals.current = JSON.parse(localStorage[`schoolMeals_${this.schoolId}_${this.zeroFill(this.date.getMonth() + 1)}`])
      }
    }
  }

  /**
   * 급식 식단표를 불러옵니다.
   * 학교 아이디와 식단표가 저장되어 있다면 로컬에서 식단표를 불러오지만
   * 학교 아이디만 있고 식단표가 저장되어 있지 않다면 식단표를 서버에 요청합니다.
   * 만약 둘 다 없을 경우 학교 검색창을 띄우도록 합니다.
   * 
   * @class LunchVue
   * @method loadMeals
   * @deprecated
   */
  loadMeals() {
    if (this.haveSchoolMeals && this.haveSchoolId) {
      // this.getMeals()
    } else if (this.haveSchoolId) {
      // this.fetch()
    } else {
      this.appendSearchModal()
    }
  }

  /**
   * 학교를 설정합니다.
   * 
   * @class LunchVue
   * @method setSchool
   * @param {object} query - 학교 코드와 이름, 도메인을 포함한 JSON 오브젝트
   */
  setSchool(query) {
    this.schoolId = localStorage[`schoolId`] = query.code
    this.schoolName = localStorage[`schoolName`] = query.name
    this.schoolDomain = localStorage[`schoolDomain`] = query.domain
    this.$searchForm.modal('hide')
    this.fetch({
      domain: this.schoolDomain,
      code: this.schoolId
    }).done((data) => {
      localStorage[`schoolMeals_${this.schoolId}_${this.zeroFill(this.date.getMonth() + 1)}`] = JSON.stringify(data)
      this.initVariables()
      $( document ).trigger('preload-end')  // 지우지 마세요.
    })
  }

  /**
   * 서버에서 급식 식단표를 가져옵니다.
   * 
   * @class LunchVue
   * @method fetch
   * @param {object} options - 서버에 보낼 데이터 타입
   */
  fetch(options) {
    return $.ajax({
      type: 'POST',
      url: '/fetch',
      dataType: 'JSON',
      contentType: 'application/json',
      data: JSON.stringify(options),
      fail: () => {
        this.displayAlert('error', '서버와의 연결이 실패했습니다. 식단을 가져올 수 없습니다.')
      },
      always: () => {
        $( document ).trigger('preload-end')
      }
    })
  }

  /**
   * 로컬 저장소에서 급식 식단표를 가져옵니다.
   * 
   * @class LunchVue
   * @method getMeals
   */
  getMeals() {
    // TODO
  }

  /**
   * 학교 검색창을 띄웁니다.
   * 입력창과 결과창의 내용을 지우고, 검색할 학교를 바로 입력할 수 있도록
   * 입력창에 포커싱을 합니다.
   * 
   * @class LunchVue
   * @method appendSearchModal
   */
  appendSearchModal() {
    this.$searchForm.modal('show')
    this.$searchSchoolInput.val('').focus()
    this.$searchResult.html('')
  }

  /**
   * 검색폼을 서버에 전송합니다. 검색할 창과 동일한 전국의
   * 모든 학교 이름과 주소, 코드를 반환합니다.
   * 
   * @class LunchVue
   * @method searchSubmit
   */
  searchSubmit() {
    const similarySchoolName = this.$searchSchoolInput.val()

    $.ajax({
      type: 'GET',
      url: `/find/${similarySchoolName}`,
      dataType: 'JSON',
      success: (data) => {
        this.printSchoolList(data)
      },
      error: () => {
        this.displayAlert('error', '서버와 연결할 수 없습니다.')
      }
    })
  }

  /**
   * 학교 목록을 출력합니다.
   * 
   * @class LunchVue
   * @method printSchoolList
   * @param {object} data
   */
  printSchoolList(data) {
    const schoolList = []

    data.map(fragment => {
      fragment.map(pieces => {
        schoolList.push(
          `<li data-school=${JSON.stringify({code: pieces.code, name: pieces.name, domain: pieces.domain})}>
            <h1>${pieces.name}</h1>
            <p>${pieces.address}</p>
          </li>`
        )
      })
    })

    this.$searchResult.html(schoolList)
  }

  /**
   * 파싱되거나 저장소에서 불러온 식단을 출력합니다.
   * 
   * @class LunchVue
   * @method printMeals
   */
  printMeals(date = this.date.getDate() - 1, time = this.time) {
    const meals = !!this.meals.current[date][time]['food'] ? this.meals.current[date][time]['food'].join('<br>') : "식단이 없어요."

    this.$result.html(meals)
  }

  /**
   * 날짜를 계산하는 함수 헬퍼입니다.
   * 
   * @class LunchVue
   * @method calcDate
   * @param {object} date - UTC 날짜
   * @return {string} 계산된 날짜를 변환합니다.
   * @example "2018. 04. 16"
   */
  calcDate(date) {
    return `${date.getFullYear()}. ${this.zeroFill(date.getMonth() + 1, 2)}. ${this.zeroFill(date.getDate(), 2)}`
  }

  /**
   * 여백을 채워주는 함수 헬퍼입니다.
   * 
   * @class LunchVue
   * @method zeroFill
   * @param {number} number - 앞에 여백으로 채울 숫자
   * @param {number} pad - 채울 칸 수
   * @return {numberic?} 
   * @example zeroFill(72, 4) returns "0072"
   */
  zeroFill(number, pad = 2) {
    const proxy = '0'.repeat(pad - 1)
    return (proxy + number).substr(-pad)
  }

  /**
   * 메시지를 표시합니다. 디버그 모드에서는 로그도 출력합니다.
   * 
   * @class LunchVue
   * @method displayAlert
   * @param {string} type - 출력할 타입
   * @param {string} message - 표시할 메시지
   */
  displayAlert(type, message) {
    //
    if (this.debug)
      console.log(message)
  }

  /**
   * 요소의 이벤트를 바인딩합니다.
   * 
   * @class LunchVue
   * @method bindEvents
   */
  bindEvents() {
    // Hacks for execute functions
    const _this = this

    this.$searchForm.bind('submit', (e) => {
      this.searchSubmit()
      e.preventDefault()
    })

    this.$header.bind('click', () => {
      this.appendSearchModal()
    })

    this.$schoolName.bind('click', () => {
      this.appendSearchModal()
    })

    this.$prevBtn.bind('click', () => {
      this.temp.date.setDate(this.temp.date.getDate() - 1)
      this.$schoolDate.html(this.calcDate(this.date))
      this.printMeals(this.temp.date.getDate() - 1)
    })

    this.$nextBtn.bind('click', () => {
      this.temp.date.setDate(this.temp.date.getDate() + 1)
      this.$schoolDate.html(this.calcDate(this.date))
      this.printMeals(this.temp.date.getDate() - 1)
    })

    $('.nav li').bind('click', function() {
      $('.nav li').removeClass('active')
      $(this).addClass('active')
      _this.printMeals(_this.date.getDate() - 1, $(this).data('type'))
    })

    $( document ).bind('keydown', (e) => {
      switch (e.keyCode) {
        case 27:
          this.appendSearchModal()
          break
        default:
          break
      }
    })

    // 동적으로 생성된 엘리먼트는 이와 같은 방법으로 바인딩해야 합니다.
    // 수정하지 마세요 ─ * DO NOT TOUCH IT *
    $( document ).on('click', '#searchResult li', function() {
      $( document ).trigger('preload-begin')
      _this.setSchool($(this).data('school'))
    })
  }
}

export default LunchVue