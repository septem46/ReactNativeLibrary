import React, {useEffect, useState, useRef} from "react";
import {
    View, 
    Animated,
    StyleSheet,
    PanResponder,
    Easing
} from 'react-native';

//*renderRightActions={function(offset_x)}
//*renderLeftActions={function(offset_x)}
//animationDuration={number}
//useNativeDriver={true / default false}
//rightThreshold={number / default 0}
//leftThreshold={number / default 0}
//overSwipeRight={bool / default false}
//overSwipeLeft={bool / default false}
//closeSwipe={true / false}
//onSwipeClosed={function}
//onSwipeOpening={function}
//onSwipeOpened={function}

export default SwipeList = (props) => {
    const animation_duration = useRef(250);
    const use_native_driver = useRef(false);
    const [pan_responder, setPanResponder] = useState(PanResponder.create());

    const is_content_on_right = useRef(false);
    const is_right_open = useRef(false);
    const right_actions_width = useRef(0);
    const right_threshold = useRef(0);
    const over_swipe_right = useRef(false);

    const is_content_on_left = useRef(false);
    const is_left_open = useRef(false);
    const left_actions_width = useRef(0);
    const left_threshold = useRef(0);
    const over_swipe_left = useRef(false);
    
    const offset_x = useRef(new Animated.Value(0));
    const last_offset_x = useRef(0);
    

    useEffect(() => {
        createPanResponder();

        if(props.animationDuration) {
            animation_duration.current = props.animationDuration;
        }

        if(props.useNativeDriver === true) {
            animation_duration.current = true;
        }

        //right actions
        if(props.renderRightActions) {
            is_content_on_right.current = true;
        }
        
        if(props.rightThreshold) {
            right_threshold.current = props.rightThreshold;
        }

        if(props.overSwipeRight === true) {
            over_swipe_right.current = true;
        }

        //left actions
        if(props.renderLeftActions) {
            is_content_on_left.current = true;
        }
        
        if(props.leftThreshold) {
            left_threshold.current = props.leftThreshold;
        }

        if(props.overSwipeLeft === true) {
            over_swipe_left.current = true;
        }
    }, []);

    useEffect(() => {
        if(props.closeSwipe) {
            closeActions();
        }
    }, [props.closeSwipe]);

    const openActions = (to_offset_x) => {
        if(props.onSwipeOpening) {
            props.onSwipeOpening();
        }
        Animated.timing(
            offset_x.current,
            {
                toValue: to_offset_x,
                duration: animation_duration.current,
                useNativeDriver: use_native_driver.current,
                easing: Easing.bezier(.21,.4,.4,.78)
            }
        ).start(() => {
            if(props.onSwipeOpened) {
                props.onSwipeOpened();
            }
        });
    }

    const closeActions = () => {
        Animated.timing(
            offset_x.current,
            {
                toValue: 0,
                duration: animation_duration.current,
                useNativeDriver: use_native_driver.current,
                easing: Easing.bezier(.21,.4,.4,.78)
            }
        ).start(() => {
            last_offset_x.current = 0;
            is_right_open.current = false;
            is_left_open.current = false;

            if(props.onSwipeClosed) {
                props.onSwipeClosed();
            }
        });
    }

    const createPanResponder = () => {

        const onPanMoveLeft = (e, state) => {
            if(is_content_on_right.current) {
                if((state.moveX < state.x0 && !is_right_open.current) || 
                (state.moveX > state.x0 && is_right_open.current)) {
                    var new_position = state.dx + last_offset_x.current;

                    if(!over_swipe_right.current && Math.abs(state.dx) > right_actions_width.current &&
                    !is_right_open.current) {
                        offset_x.current.setValue(-right_actions_width.current);
                        return;
                    }
                    if(!over_swipe_right.current && is_right_open.current && new_position > 0) {
                        offset_x.current.setValue(0);
                        return;
                    }
                    offset_x.current.setValue(new_position);
                }
            }
        }

        const onPanMoveRight = (e, state) => {
            if(is_content_on_left.current) {
                if((state.moveX > state.x0 && !is_left_open.current) || //moves right
                (state.moveX < state.x0 && is_left_open.current)) { //moves left
                    var new_position = state.dx + last_offset_x.current;

                    if(!over_swipe_left.current && Math.abs(state.dx) > left_actions_width.current &&
                    !is_left_open.current) {
                        offset_x.current.setValue(left_actions_width.current);
                        return;
                    }
                    if(!over_swipe_left.current && is_left_open.current && new_position < 0) {
                        offset_x.current.setValue(0);
                        return;
                    }
                    offset_x.current.setValue(new_position);
                }
            }
        }

        const onPanRelease = (e, state) => {
            if(is_content_on_right.current && !is_left_open.current) {
                if((!is_right_open.current && state.dx <= -right_threshold.current) ||
                (is_right_open.current && Math.abs(state.dx) < right_threshold.current)) {
                    openActions(-right_actions_width.current);
                    last_offset_x.current = -right_actions_width.current;
                    is_right_open.current = true;
                }
                else if ((is_right_open.current && state.dx > right_threshold.current) ||
                (!is_right_open.current && Math.abs(state.dx) < right_threshold.current)) {
                    closeActions();
                }
            }

            if(is_content_on_left.current && !is_right_open.current) {
                if((!is_left_open.current && state.dx >= left_threshold.current) ||
                (is_left_open.current && Math.abs(state.dx) < left_threshold.current)) {
                    openActions(left_actions_width.current);
                    last_offset_x.current = left_actions_width.current;
                    is_left_open.current = true;
                }
                else if ((is_left_open.current && state.dx < -left_threshold.current) ||
                (!is_left_open.current && state.dx < left_threshold.current)) {
                    closeActions();
                }
            }
        }

        setPanResponder(PanResponder.create(
            {
                onMoveShouldSetPanResponder: (evt, gestureState) => {
                    if(Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
                        return true;
                    }
                    else {
                        return false;
                    }
                },
                onPanResponderMove: (e, state) => {onPanMoveLeft(e, state); onPanMoveRight(e, state)},
                onPanResponderRelease: onPanRelease,
                onPanResponderTerminate: onPanRelease,
            }
        ));
    }

    const onRightActionsLayout = (e) => {
        right_actions_width.current = e.nativeEvent.layout.width;
    }

    const onLeftActionsLayout = (e) => {
        left_actions_width.current = e.nativeEvent.layout.width;
    }

    return (
        <View>

            {is_content_on_left.current ? 
            <View
                style={styles.left_actions}
                onLayout={(e) => onLeftActionsLayout(e)}
            >
                {props.renderLeftActions(offset_x.current)}
            </View> : false
            }

            {is_content_on_right.current ? 
            <View
                style={styles.right_actions}
                onLayout={(e) => onRightActionsLayout(e)}
            >
                {props.renderRightActions(offset_x.current)}
            </View> : false
            }

            <Animated.View
                style={{transform: [{translateX: offset_x.current}]}}
                {...pan_responder.panHandlers}
            >
                {props.children}
            </Animated.View>
        </View>
    );
}

var styles = StyleSheet.create({
    left_actions: {
        position: "absolute",
        left: 0
    },
    right_actions: {
        position: "absolute",
        right: 0
    }
});