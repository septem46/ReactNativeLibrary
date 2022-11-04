import React, {useEffect, useState, useRef} from "react";
import {
    View, 
    Modal, 
    Animated,
    StyleSheet,
    TouchableWithoutFeedback,
    Dimensions,
    Keyboard,
    Platform,
    PanResponder,
} from 'react-native';

//*required
//*dynamic* can be changed during open modal
//*isModalOpen={true/false}open/close modal *dynamic*
//style={styles} *dynamic*
//animationDuration={milliseconds} *dynamic*
//onClosing={func} *dynamic*
//onClosed={func} *dynamic*
//onOpened={func} *dynamic*
//*modalPosition={'top', 'center', 'bottom', 'top-left', 'top-right'}
//*entryFrom={'left', 'top', 'right', 'bottom', 'fade-in'}
//backdrop={true/ default false}
//backdropOpacity={num}
//backdropColor={'color'}
//backdropPressToClose={true/ default false}
//useNativeDriver={true/ default false}

export default ModalBox = (props) => {
    const [is_modal_open, setIsModalOpen] = useState(false);
    
    const backdrop_opacity = useRef(new Animated.Value(0));
    const to_backdrop_opacity = useRef(0);
    const backdrop_color = useRef('#000');

    const animation_duration = useRef(250);
    const use_native_driver = useRef(false);

    const screen_size = useRef(Dimensions.get('window'));

    const modal_size = useRef({width: 0, height: 0});
    const [modal_rendered, setModalRendered] = useState(false);

    const container_size = useRef({width: 0, height: 0});
    const [container_rendered, setContainerRendered] = useState(false);

    const offset_y = useRef(new Animated.Value(0));
    const offset_x = useRef(new Animated.Value(0));
    const initial_offset_y = useRef(0);
    const initial_offset_x = useRef(0);
    const [readjust_vertically, setReadjustVertically] = useState(false);
    const [readjust_horizontally, setReadjustHorizontally] = useState(false);
    const modal_fade_opacity = useRef(new Animated.Value(0));
    const keyboard_listeners = useRef([]);
    const keyboard_height = useRef(0);
    const [pan_responder, setPanResponder] = useState(PanResponder.create());
    const to_offset_x = useRef(0);
    const to_offset_y = useRef(0);
    const first_time_open = useRef(true);
    const is_modal_closing = useRef(false);

    useEffect(() => {
        if(props.backdropOpacity) {
            to_backdrop_opacity.current = props.backdropOpacity;
        }

        if(props.backdropColor) {
            backdrop_color.current = props.backdropColor;
        }

        if(props.animationDuration) {
            animation_duration.current = props.animationDuration;
        }

        if (props.useNativeDriver) {
            use_native_driver.current = true;
        }

        if (Platform.OS === 'ios') {
            keyboard_listeners.current = [
                ...keyboard_listeners.current,
                Keyboard.addListener('keyboardWillChangeFrame', onKeyboardChange),
                Keyboard.addListener('keyboardDidHide', onKeyboardHide)
            ];
        }

        createPanResponder();
        
        return cleanup = () => {
            if (keyboard_listeners.current) keyboard_listeners.current.forEach((sub) => sub.remove());
        };
    }, []);

    useEffect(() => {
        if(props.isModalOpen) {
            if(first_time_open.current) {
                setInitialPosition();
            }

            setIsModalOpen(true);
        }
        else if (is_modal_open) {
            closeModal();
        }
    }, [props.isModalOpen]);

    useEffect(() => {
        if(!is_modal_open) {
            setReadjustVertically(false);
            setReadjustHorizontally(false);
            setModalRendered(false);
            setContainerRendered(false);

            first_time_open.current = true;
            modal_fade_opacity.current.setValue(0);
            is_modal_closing.current = false;

            props.onClosed ? props.onClosed() : false;
        }
    }, [is_modal_open]);

    useEffect(() => {//keyboard (android only) changed/mounted/dismounted will invoke this function
        if(props.isModalOpen && !is_modal_closing.current) {
    
            if(props.onOpening && first_time_open.current) {
                props.onOpening();
            }

            if((modal_rendered && container_rendered) || 
               (!first_time_open.current && (readjust_horizontally || readjust_vertically))) {
                openModal();
            }
        }
    }, [
        modal_rendered, 
        container_rendered,
        readjust_horizontally, 
        readjust_vertically
    ]);

    const setInitialPosition = () => {
        //set initial position of the modal
        if(props.entryFrom == 'bottom') {
            var new_offset = screen_size.current.height;
            offset_y.current.setValue(new_offset);
            initial_offset_y.current = new_offset;
        }
        else if(props.entryFrom == 'top') {
            var new_offset = -screen_size.current.height;
            offset_y.current.setValue(new_offset);
            initial_offset_y.current = new_offset;
        }
        else if(props.entryFrom == 'left') {
            var new_offset = -screen_size.current.width;
            offset_x.current.setValue(new_offset);
            initial_offset_x.current = new_offset;
        }
        else if(props.entryFrom == 'right') {
            var new_offset = screen_size.current.width;
            offset_x.current.setValue(new_offset);
            initial_offset_x.current = new_offset;
        }
    };

    const createPanResponder = () => {

        const onPanMove = (e, state) => {
            if(props.entryFrom == 'fade-in' || props.entryFrom == 'bottom') {
                if(state.moveY > state.y0) {
                    var new_position = to_offset_y.current + state.dy;

                    offset_y.current.setValue(new_position);
                }
            }
            else if (props.entryFrom == 'top') {
                if(state.moveY < state.y0) {
                    var new_position = to_offset_y.current + state.dy;

                    offset_y.current.setValue(new_position);
                }
            }
            else if (props.entryFrom == 'left') {
                if(state.moveX < state.x0) {
                    var new_position = to_offset_x.current + state.dx;

                    offset_x.current.setValue(new_position);
                }
            }
            else if (props.entryFrom == 'right') {
                if(state.moveX > state.x0) {
                    var new_position = to_offset_x.current + state.dx;

                    offset_x.current.setValue(new_position);
                }
            }
        }

        const onPanRelease = (e, state) => {
            let swipe_threshold = 100;
            //alert("dx:" + state.dx + " x0:" + state.x0 + " moveX:" + state.moveX);
            if(props.entryFrom == 'fade-in' || props.entryFrom == 'bottom') {
                if(state.dy >= swipe_threshold) {
                    closeModal();
                }
                else {
                    setReadjustVertically(true);
                }
            }
            else if (props.entryFrom == 'top') {
                if(state.dy <= -swipe_threshold) {
                    closeModal();
                }
                else {
                    setReadjustVertically(true);
                }
            }
            else if (props.entryFrom == 'left') {
                if(state.dx <= -swipe_threshold) {
                    closeModal();
                }
                else {
                    setReadjustHorizontally(true);
                }
            }
            else if (props.entryFrom == 'right') {
                if(state.dx >= swipe_threshold) {
                    closeModal();
                }
                else {
                    setReadjustHorizontally(true);
                }
            }
        }

        setPanResponder(PanResponder.create(
            {
                onStartShouldSetPanResponder: (evt, gestureState) => true,
                onPanResponderMove: onPanMove,
                onPanResponderRelease: onPanRelease,
                onPanResponderTerminate: onPanRelease,
            }
        ));
    }


    //iOS only
    /*****************************/
    const onKeyboardHide = () => {
        keyboard_height.current = 0;
        setReadjustVertically(true);
    }

    const onKeyboardChange = (e) => {
        keyboard_height.current = e.endCoordinates.height;
        setReadjustVertically(true);
    };
    /*****************************/

    const openModal = () => {
        var _to_offset_x = 0;
        if(props.modalPosition == 'center' || props.modalPosition == 'top' ||
            props.modalPosition == 'bottom') {
                _to_offset_x = (container_size.current.width - modal_size.current.width) / 2;
            if(_to_offset_x < 0) _to_offset_x = 0;
        }
        else if (props.modalPosition == 'top-left') {
            _to_offset_x = 0;
        }
        else if (props.modalPosition == 'top-right') {
            _to_offset_x = (container_size.current.width - modal_size.current.width);
        }
        to_offset_x.current = _to_offset_x;
        
        var _to_offset_y = 0;
        if(props.modalPosition == 'center') {
            _to_offset_y = (container_size.current.height - keyboard_height.current - modal_size.current.height) / 2;
            if(_to_offset_y < 0) _to_offset_y = 0;
        }
        else if(props.modalPosition == 'top' || props.modalPosition == 'top-left' ||
                props.modalPosition == 'top-right') {
            _to_offset_y = 0;
        }
        else if(props.modalPosition == 'bottom') {
            _to_offset_y = container_size.current.height - keyboard_height.current - modal_size.current.height;
        }
        to_offset_y.current = _to_offset_y;
        
        if(props.entryFrom == 'top' || props.entryFrom == 'bottom' || (readjust_vertically && !first_time_open.current)) {
            offset_x.current.setValue(_to_offset_x);

            if(first_time_open.current) {
                modal_fade_opacity.current.setValue(1);
            }

            requestAnimationFrame(() => {//makes animation smoother
                Animated.parallel([
                    Animated.timing(
                        offset_y.current,
                        {
                            toValue: _to_offset_y,
                            duration: animation_duration.current,
                            useNativeDriver: use_native_driver.current,
                        }
                    ),
                    props.backdrop ? animateBackdropOpen : false
                ]).start(() => {
                    onOpened();
                });
            });
        }
        else if (((props.entryFrom == 'left' || props.entryFrom == 'right') && first_time_open.current) || (readjust_horizontally && !first_time_open.current)) {
            offset_y.current.setValue(_to_offset_y);
            modal_fade_opacity.current.setValue(1);

            requestAnimationFrame(() => {//makes animation smoother
                Animated.parallel([
                    Animated.timing(
                        offset_x.current,
                        {
                            toValue: _to_offset_x,
                            duration: animation_duration.current,
                            useNativeDriver: use_native_driver.current,
                        }
                    ),
                    props.backdrop ? animateBackdropOpen : false
                ]).start(() => {
                    onOpened();
                });
            });
        }
        else if (props.entryFrom == 'fade-in' && first_time_open.current) {
            offset_y.current.setValue(_to_offset_y);
            offset_x.current.setValue(_to_offset_x);

            requestAnimationFrame(() => {//makes animation smoother
                Animated.parallel([
                    Animated.timing(
                        modal_fade_opacity.current,
                        {
                            toValue: 1,
                            duration: animation_duration.current,
                            useNativeDriver: use_native_driver.current,
                        }
                    ),
                    props.backdrop ? animateBackdropOpen : false
                ]).start(() => {
                    onOpened();
                });
            });
        }

        const onOpened = () => {
            if(props.onOpened && first_time_open.current) {
                props.onOpened();
            }

            setReadjustVertically(false);
            setReadjustHorizontally(false);

            first_time_open.current = false;
        }
    }

    const closeModal = () => {
        is_modal_closing.current = true;

        if(props.onClosing) props.onClosing();
        
        if(props.entryFrom == 'top' || props.entryFrom == 'bottom') {
            requestAnimationFrame(() => {//makes animation smoother
                Animated.parallel([
                    Animated.timing(
                        offset_y.current,
                        {
                            toValue: initial_offset_y.current,
                            duration: animation_duration.current,
                            useNativeDriver: use_native_driver.current,
                        }
                    ),
                    props.backdrop ? animateBackdropClose : false    
                ]).start(() => {
                    onClosed();
                });
            });
        }
        else if (props.entryFrom == 'left' || props.entryFrom == 'right') {
            requestAnimationFrame(() => {//makes animation smoother
                Animated.parallel([
                    Animated.timing(
                        offset_x.current,
                        {
                            toValue: initial_offset_x.current,
                            duration: animation_duration.current,
                            useNativeDriver: use_native_driver.current,
                        }
                    ),
                    props.backdrop ? animateBackdropClose : false
                ]).start(() => {
                    onClosed();
                });
            });
        }
        else if (props.entryFrom == 'fade-in') {
            requestAnimationFrame(() => {//makes animation smoother
                Animated.parallel([
                    Animated.timing(
                        modal_fade_opacity.current,
                        {
                            toValue: -1,
                            duration: animation_duration.current,
                            useNativeDriver: use_native_driver.current,
                        }
                    ),
                    props.backdrop ? animateBackdropClose : false        
                ]).start(() => {
                    onClosed();
                });
            });
        }

        const onClosed = () => {
            setIsModalOpen(false);
        };
    }
    
    const animateBackdropOpen = 
        Animated.timing(
            backdrop_opacity.current,
            {
              toValue: to_backdrop_opacity.current,
              duration: animation_duration.current,
              useNativeDriver: use_native_driver.current,
            }
        );

    const animateBackdropClose = 
        Animated.timing(
            backdrop_opacity.current,
            {
                toValue: 0,
                duration: animation_duration.current,
                useNativeDriver: use_native_driver.current,
            }
          );

    const onViewLayout = (e) => {
        modal_size.current.height = e.nativeEvent.layout.height;
        modal_size.current.width = e.nativeEvent.layout.width;

        setModalRendered(true);
    }

    const onContainerLayout = (e) => {//called every time screen layout changes(keyboard change and etc.)
        container_size.current.height = e.nativeEvent.layout.height;
        container_size.current.width = e.nativeEvent.layout.width;
        
        if(first_time_open.current) {
            setContainerRendered(true);
        }
        else if (!first_time_open.current && !is_modal_closing.current) {
            setReadjustVertically(true);
        }
    }


    const getBackDrop = () => {
        if(props.backdrop) {
            return (
                <TouchableWithoutFeedback onPress={() => props.backdropPressToClose ? closeModal() : null}>
                    <Animated.View style={[styles.absolute, {opacity: backdrop_opacity.current, 
                                          backgroundColor: backdrop_color.current}]}>
                    </Animated.View>
                </TouchableWithoutFeedback>
            );
        }
    }
    
    const getContents = () => {
        return (
            <Animated.View
                onLayout={(e) => onViewLayout(e)}
                style={[props.style, {opacity: modal_fade_opacity.current, 
                        transform: [{translateY: offset_y.current}, {translateX: offset_x.current}]}]}
                {...pan_responder.panHandlers}
            >
                {props.children}
            </Animated.View>
        );
    }

    return (
        <Modal
            visible={is_modal_open}
            transparent={true}
            supportedOrientations={['landscape', 'portrait', 'portrait-upside-down']}
            hardwareAccelerated={true}
        >
            <View 
                style={[styles.absolute, {flex: 1}]}
                onLayout={(e) => onContainerLayout(e)}
            >
                {getBackDrop()}
                {getContents()}
            </View>
        </Modal>
    );
}

var styles = StyleSheet.create({  
    absolute: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    }
  });
