$(document).ready(function(){
  // Popup js
  $(document).on("click", ".customize_button", function (e) {
    e.preventDefault();
    $(".ms_popup_wr").addClass("visible");
    $("body").css("overflow", "hidden");
  });
  $(document).on("click", ".ms_popup_overlay, .ms_close_btn", function () {
    $(".ms_popup_wr").removeClass("visible");
    $("body").css("overflow", "auto");
  });

  // Swatch functionality
  function swatch_functionality(swatch){
    var input_name = $(swatch).attr('name');
    var image_src = $(swatch).prev().attr('src');
    var swatch_name = $(swatch).attr('data-swatch-name-display');
    var selectedImage = $(swatch).parents('.single_swatch_main').find('.swatch_img').attr('src');
    if(input_name == 'neckline'){
      $('.style_main :first-child').text(swatch_name);
      $('.image_group_main .top_image.image_bg').attr("src", image_src);
      $('.image_group_main .top_image.image_fg').fadeOut(500, function() {
        $(this).attr("src", image_src).fadeIn(500);
      });
    } else if(input_name == 'sleevetype'){
      $('.style_main :nth-child(2)').text(swatch_name);
      $('.image_group_main .middle_image.image_bg').attr("src", image_src);
      $('.image_group_main .middle_image.image_fg').fadeOut(500, function() {
        $(this).attr("src", image_src).fadeIn(500);
      });
    } else if(input_name == 'bottomlength' || input_name == 'pantlength'){
      $('.style_main :nth-child(3)').text(swatch_name);
      $('.image_group_main .bottom_image.image_bg').attr("src", image_src);
      $('.image_group_main .bottom_image.image_fg').fadeOut(500, function() {
        $(this).attr("src", image_src).fadeIn(500);
      });
    }
  }
  
  // On load, check swatch image src in main image
  $('.swatch_slider_main .swatch_single .swatch_input').each(function () {
    if($(this).is(':checked')){
      swatch_functionality(this);
    }
  });
  
  // On input change, swatch image src in main image
  $('.swatch_input').on('change', function(){
    swatch_functionality(this); 
    var selectedImage = $(this).parents('.swatch_item').find('.swatch_img').attr('src');
    $(this).parents('.slider_with_default').find('.swatch_single.only_swatch .swatch_img').attr('src', selectedImage);
    var selectedStyle = $(this).parents('.swatch_item').find('.swatch_text').text();
    $(this).parents('.slider_with_default').find('.swatch_single.only_swatch .swatch_text').text(selectedStyle);
  });

  // Swiper in swatches when there are more than 9 swatch images
  $(function() {
    renderSlides('swiper1','.swipe1','.swiper-button-next1','.swiper-button-prev1');
    renderSlides('swiper2','.swipe2','.swiper-button-next2','.swiper-button-prev2');
    renderSlides('swiper3','.swipe3','.swiper-button-next3','.swiper-button-prev3');
    renderSlides('swiper4','.swipe4','.swiper-button-next4','.swiper-button-prev4');
  }); 
  
  function renderSlides(swipers,selector,nextBtn,prevBtn) {
    var swipers = new Swiper(selector, {
      slidesPerView: 'auto',
      slidesPerGroup: 1,
      spaceBetween: 10,
      loop: false,
      navigation: {
          nextEl: nextBtn,
          prevEl: prevBtn,
      }
    });
  }

  // to change image swatch and name when click on select style
  $(document).on('click', '.submit_button', function(){
    $('.customize_btn').hide();
    $('.reset_button').addClass('show_reset');
    $('.product-slideshow').addClass('active');
    $('.swatch_input:checked').each(function(){
      var swatch_name = $(this).attr('data-swatch-name-display');
      var selected_swatch_image = $(this).next('.swatch_img').attr('src');
      var selcted_swatch_name = $(this).attr('name');
      $('.pg_swatch_img_text').each(function(){
        var data_name = $(this).attr('data-name');
        if(selcted_swatch_name == data_name){
          $(this).find('img').attr('src', selected_swatch_image);
          $(this).find('.pg_swatch_text').text(swatch_name);
        }
      });
      $('.cart_properties input').each(function(){
        var data_class_name = $(this).attr('data-class');
        if(selcted_swatch_name == data_class_name){
          $(this).val(swatch_name);
        }
      });

      $('.ymq-box .ymq-options-box').each(function(){
        var data_label = $(this).attr('data-label').toLowerCase();
        if(selcted_swatch_name == data_label){
          $(this).find('.ymq-input-text').val(swatch_name);
        }
      });
    });

    // Api call for image processing and display
    function collectAndSendImages() {
      let imageUrls = [];
  
      var main_image_url = $('.main_image').attr('src');
      if (main_image_url) {
          imageUrls.push(main_image_url);
      }
  
      $('.swatch_input:checked').each(function(){
          var display_image = $(this).prev().attr('src');
          if(display_image) {
              imageUrls.push(display_image);
          }
      });
  
      fetchPhoto(imageUrls);
    }

    function fetchPhoto(imageUrls) {
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
  
      const raw = JSON.stringify({
          imageUrls: imageUrls,
      });
  
      const requestOptions = {
          method: "POST",
          headers: myHeaders,
          body: raw,
          redirect: "follow",
      };
  
      fetch("https://image-stitching-app-usu8y.ondigitalocean.app/compositeImage", requestOptions)
          .then(response => response.json())
          .then(result => {
              displayPhoto(result.imageUrl);
          })
          .catch(error => console.error(error));
    }
    function displayPhoto(imgUrl) {
      $('.product-slideshow').removeClass('active');
      // Select the elements that need the srcset update and fade effect
      var mainSlide = $('.product-main-slide[data-index="0"]').find('.photoswipe__image');
      var thumbnail = $('.product__thumb-item[data-index="0"] .product__thumb img');
      mainSlide.attr('data-photoswipe-src', imgUrl)
      // Fade out the current images
      mainSlide.fadeOut(500, function() {
          // Update srcset after fade out
          $(this).attr('srcset', imgUrl).on('load', function() {
              // Ensure the image is loaded before fading it back in
              $(this).fadeIn(500);
          });
          // If the image is cached, the load event may not trigger. Reset the src to ensure it loads:
          this.srcset = '';
          this.srcset = imgUrl;
      });
  
      thumbnail.fadeOut(500, function() {
          $(this).attr('srcset', imgUrl).on('load', function() {
              $(this).fadeIn(500);
          });
          this.srcset = '';
          this.srcset = imgUrl;
      });
      $('.product__thumb-item[data-index="0"] .product__thumb img').trigger('click')
      $('.ymq-box .customize_image.custom_property').find('.ymq-input-text').val(`${imgUrl}`);
      $('.product-single__form .customize_image').val(`${imgUrl}`);  
      if(!$('.product-main-slide[data-index="0"]').find('.product-image-main .styled_by_u').length){
        var style_url = $('.product-slideshow').attr('data-style-image');
        if(style_url){
          $('.product-main-slide[data-index="0"]').find('.product-image-main').append(`<span class="styled_by_u"><img src="${style_url}"></span>`).hide().fadeIn(500);
        }
      }
    }
      
    collectAndSendImages();
  });

  // reset to initial image and text
  $(document).on('click', '.show_reset.reset_button', function(){
    $('.customize_btn').show();
    $('.pg_swatch_img_text img').attr('src', 'https://cdn.shopify.com/s/files/1/0738/9973/7371/files/As_Shown.jpg?v=1712843242');
    $('.pg_swatch_img_text .pg_swatch_text').text('As shown');
    $('.reset_button').removeClass('show_reset');
    // revert the images as initial
    var selected_main_img = $('.product-main-slide[data-index="0"]').find('.photoswipe__image').attr('data-srcset');
    $('.product-main-slide[data-index="0"]').find('.photoswipe__image').attr('data-photoswipe-src', selected_main_img);
    $('.product-main-slide[data-index="0"]').find('.photoswipe__image').attr('srcset', selected_main_img);
    var selected_thumb__img = $('.product__thumb[data-index="0"] img').attr('data-srcset');
    $('.product__thumb[data-index="0"] img').attr('srcset', selected_thumb__img);
    $('.custom_property .ymq-input-text').val('');
    $('.hidden_input').val('');
    $('.product-main-slide[data-index="0"]').find('.product-image-main .styled_by_u').remove();
  });

  // mobile tab feature
  mobile_swatch();
  $(window).on('resize', function(){
    mobile_swatch();
  });
  function mobile_swatch(){
    if ($(window).outerWidth() < 767) {
      $('.mob_tab_heading a:first-child').addClass('active');
      $('.single_swatch_main').hide();
      $('.single_swatch_main:first').show();
      $('.mob_tab_heading a').click(function () {
        $('.mob_tab_heading a').removeClass('active');
        $(this).addClass('active');
        $('.single_swatch_main').hide();
        var activeTab = $(this).attr('href');
        $(activeTab).fadeIn();
        return false;
      });
    }else{
      $('.single_swatch_main').show();
    }
  }

  // size attribute in cart
  $(document).on('change', '.size_option', function(){
    var size_val = $(this).val();
    console.log(size_val);
    $('.size_input').val(size_val);
  })
});