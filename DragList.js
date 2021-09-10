import React, {useEffect, useState, useRef, useMemo} from "react";
import {
    View, 
    Animated,
    StyleSheet,
    PanResponder,
    FlatList,
    TouchableWithoutFeedback,
    Easing
} from 'react-native';


//animationDuration={number / default 250}
//useNativeDriver={bool / default false}

//*props for DragList
//threshold={number / default 0} when to swap elements(sensitivity) in %
//blockLeftRightMove={bool / default false} false: move element to any direction, true: only up/down
//pressDelay={number / default 1000} in how many micro-sec should dragging be activated
//draggingActivated={function}
//draggingDeactivated={function}
//stylesWhenDragging={styles class}
//defaultStyles={styles class}

//props for swipeList
//*renderRightActions={function(offset_x)}
//*renderLeftActions={function(offset_x)}
//rightThreshold={number / default 0}
//leftThreshold={number / default 0}
//overSwipeRight={bool / default false}
//overSwipeLeft={bool / default false}
//closeAllSwipes={bool}
//onSwiped={function}

const ListItem = (props) => {
    const [pan_responder, setPanResponder] = useState(PanResponder.create());
    const can_drag = useRef(false);
    const terminate_dragging = useRef(false);
    const timeout = useRef(() =>{});
    const drag_xy = useRef(new Animated.ValueXY(0));
    const element_height = useRef(0);
    const [z_index, setZIndex] = useState(0);
    const swap_on = useRef(0);
    const last_y_position = useRef(0); //last position when move direction changed
    const last_dy_when_dragging = useRef(0);
    const move_direction = useRef('');
    const max_order_num = useRef(0);
    const move_order_num = useRef(0);
    const threshold = useRef(0);
    const [element_styles, setElementStyles] = useState();
    const [global_opacity, setGlobalOpacity] = useState(0);//workaround to display contents after css is loaded

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
    const last_offset_x = useRef(0);
    const offset_x = useRef(new Animated.Value(0));
    const can_swipe = useRef(false);
    const is_swiped = useRef(false);

    const close_actions_animating = useRef(false)

    useEffect(() => {
        createDragResponder();

        //right actions
        if(props.isContentOnRight) {
            is_content_on_right.current = true;
        }
        
        if(props.rightThreshold) {
            right_threshold.current = props.rightThreshold;
        }

        if(props.overSwipeRight === true) {
            over_swipe_right.current = true;
        }

        //left actions
        if(props.isContentOnLeft) {
            is_content_on_left.current = true;
        }
        
        if(props.leftThreshold) {
            left_threshold.current = props.leftThreshold;
        }

        if(props.overSwipeLeft === true) {
            over_swipe_left.current = true;
        }

        setElementStyles(props.defaultStyles);
        setGlobalOpacity(1);
    }, []);

    useMemo(() => {
        props.pressDelay ? press_delay = props.pressDelay : press_delay = 1000;
        props.animationDuration ? animation_duration = props.animationDuration : animation_duration = 250;
        props.useNativeDriver === true ? use_native_driver = true : use_native_driver = false;
        props.blockLeftRightMove === true ? block_left_right = true : block_left_right = false;
    }, [props]);

    useEffect(() => {
        drag_xy.current.setValue({x: 0, y: 0});
        props.addMoveControl(moveControl);
        props.addCloseSwipeLink(closeSwipe);

        last_y_position.current = 0;
        last_dy_when_dragging.current = 0;
        move_direction.current = '';
    }, [props.data]);

    useEffect(() => {
        max_order_num.current = props.maxOrderNum;
    }, [props.maxOrderNum]);

    useEffect(() => {
        if(props.closeAllSwipes == true && is_swiped.current == true) {
            closeActions();
        }
    }, [props.closeAllSwipes]);

    const closeSwipe = () => {
        if(is_swiped.current) {
            closeActions();
            is_swiped.current = false;
        }
    }

    const openActions = (to_offset_x) => {
        Animated.timing(
            offset_x.current,
            {
                toValue: to_offset_x,
                duration: animation_duration,
                useNativeDriver: use_native_driver,
                easing: Easing.bezier(.21,.4,.4,.78)
            }
        ).start(() => {
            props.closeOtherSwipes(props.getOrderNum());//sometimes first closeOtherSwipes wont work.
            props.onSwiped();
            is_swiped.current = true;
        });
    }

    const closeActions = () => {
        close_actions_animating.current = true;
        Animated.timing(
            offset_x.current,
            {
                toValue: 0,
                duration: animation_duration,
                useNativeDriver: use_native_driver,
                easing: Easing.bezier(.21,.4,.4,.78)
            }
        ).start(() => {
            last_offset_x.current = 0;
            is_right_open.current = false;
            is_left_open.current = false;

            if(props.onSwipeClosed) {
                props.onSwipeClosed();
            }
            close_actions_animating.current = false;
        });
    }

    const createDragResponder = () => {
        const onPanMove = (e, state) => {
            if(can_drag.current && !terminate_dragging.current) {
                clearTimeout(timeout.current);
                can_swipe.current = false;
                if(block_left_right) {
                    state.dx = 0;
                }
                
                let current_y = state.dy + last_dy_when_dragging.current;
                drag_xy.current.setValue({ x: state.dx, y: current_y});

                //used to change move_direction
                if(current_y < (last_y_position.current - 5)) {//went up
                    last_y_position.current = current_y;
                    move_direction.current = 'up';
                }
                else if(current_y > (last_y_position.current + 5)) {//went down
                    last_y_position.current = current_y;
                    move_direction.current = 'down';
                }

                //detect when to perform swap
                if (current_y < (swap_on.current - threshold.current) 
                && move_direction.current == 'up') {//swap up
                    move_order_num.current--;
                    if(move_order_num.current >= 1) {
                        props.changePosition('up', move_order_num.current);
                        swap_on.current -= element_height.current;
                    }
                    else {
                        move_order_num.current = 1;
                    }
                }
                else if(current_y > (swap_on.current + threshold.current) 
                && move_direction.current == 'down') {//swap down
                    move_order_num.current++;
                    if(move_order_num.current <= max_order_num.current) {
                        props.changePosition('down', move_order_num.current);
                        swap_on.current += element_height.current;
                    }
                    else {
                        move_order_num.current = max_order_num.current;
                    }
                }
            }
            else {
                clearTimeout(timeout.current);
            }

            if(can_swipe.current) {
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
        }

        const onPanRelease = (e, state) => {
            if (can_drag.current) {
                can_drag.current = false;
                last_dy_when_dragging.current = swap_on.current;
                requestAnimationFrame(() => {//makes animation smoother
                    Animated.timing(
                        drag_xy.current,
                        {
                            toValue: { x: 0, y: swap_on.current},
                            duration: animation_duration,
                            useNativeDriver: use_native_driver,
                        }
                    ).start(() => {
                        onDragEnd();
                    });
                });
            }

            if(can_swipe.current) {
                can_swipe.current = false;

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
        }

        setPanResponder(PanResponder.create({
            onMoveShouldSetPanResponder: (e, state) => {
                if(!can_drag.current && props.dragEnabled) {
                    clearTimeout(timeout.current);
                }
                if(can_drag.current) {
                    return true;
                }
                if(props.swipeEnabled) {
                    if(Math.abs(state.dx) > Math.abs(state.dy) && !close_actions_animating.current) {
                        can_swipe.current = true;
                        return true;
                    }
                }
                return false;
            },
            onPanResponderMove: (e, state) => {onPanMove(e, state)},
            onPanResponderRelease: onPanRelease,
            onPanResponderTerminate: onPanRelease,
            onShouldBlockNativeResponder: (e, state) => {return true}
        }));
    }

    const activateDragging = () => {
        can_drag.current = true;
        move_order_num.current = props.getOrderNum();
        setZIndex(1);
        props.setIsScrollEnabled(false);
        swap_on.current = last_dy_when_dragging.current;
        terminate_dragging.current = false;

        props.draggingActivated();
        setElementStyles(props.stylesWhenDragging);
    }

    const onDragEnd = () => {
        setZIndex(0);
        props.setIsScrollEnabled(true);
        props.sortData();
        props.draggingDeactivated();
        setElementStyles(props.defaultStyles);
    }

    const deActivateDragging = () => {
        can_drag.current = false;
        onDragEnd();
    }

    const onComponentLayout = (e) => {
        element_height.current = e.nativeEvent.layout.height;
        if(props.threshold) {
            threshold.current = Math.round((props.threshold / 100) * element_height.current);
        }
    }

    const onRightActionsLayout = (e) => {
        right_actions_width.current = e.nativeEvent.layout.width;
    }

    const onLeftActionsLayout = (e) => {
        left_actions_width.current = e.nativeEvent.layout.width;
    }

    const moveControl = (move_up_down) => {
        if(move_up_down == 'up') {
            last_dy_when_dragging.current -= element_height.current;
        }
        else if (move_up_down == 'down') {
            last_dy_when_dragging.current += element_height.current;
        }
        //last_dy_when_dragging.current = to_y.current;

        Animated.timing(
            drag_xy.current,
            {
                toValue: { x: 0, y: last_dy_when_dragging.current},
                duration: animation_duration,
                useNativeDriver: use_native_driver,
            }
        ).start();
    }
   
    return (
        <Animated.View
            style={{
                transform: drag_xy.current.getTranslateTransform(), 
                zIndex: (Platform.OS === 'ios') ? z_index : 0,
                elevation: (Platform.OS === 'android') ? z_index : 0
            }}
        >
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
                onLayout={(e) => onComponentLayout(e)}
                style={{
                    transform: [{translateX: offset_x.current}],
                    opacity: global_opacity,
                    ...element_styles
                }}
                {...pan_responder.panHandlers}
            >
                <TouchableWithoutFeedback
                    onPressIn={() => {
                        if(props.dragEnabled) {
                            timeout.current = setTimeout(activateDragging, press_delay);
                        }
                        if(props.swipeEnabled) {
                            props.closeOtherSwipes(props.getOrderNum());
                        }
                    }}
                    onPressOut={() => {
                        if(!can_drag.current && props.dragEnabled) {
                            clearTimeout(timeout.current);
                        }

                        //workaround to disable dragging if it was activated but never dragged
                        if(can_drag.current && props.dragEnabled) {
                            timeout.current = setTimeout(deActivateDragging, 250);
                        }
                    }}
                >
                    <View>
                        {props.children}
                        {props.ItemSeparatorComponent()}
                    </View>
                </TouchableWithoutFeedback>
            </Animated.View>
        </Animated.View>
    );
}

//must be outside component function to prevent reference change on re-render
const onViewableItemsChanged = (info) => {
    //use this to implement auto-scrolling
    //alert(JSON.stringify(info));
}

const closeSwipeList = (data, current_order_num) => {
    data.map((item) =>
    {
        //if(item.order_num != current_order_num && item.closeSwipe) {
        if(item.closeSwipe) {
            item.closeSwipe();
        }
    });
}

export default DragList = (props) => {
    const flat_list_ref = useRef();
    const [is_scroll_enabled, setIsScrollEnabled] = useState(true);
    
    useMemo(() => {
        max_order_num = props.data.length;

        !props.initialNumToRender ? max_view_index = max_order_num : max_view_index = props.initialNumToRender - 1;

        min_view_index = 0;

        data = [...props.data];

        initial_data = [];
        props.data.map((item) => {
            initial_data = [...initial_data, {...item}];
        });
    }, [props.data]);

    return (
        <FlatList 
            {...props}
            ref={flat_list_ref}
            onViewableItemsChanged={onViewableItemsChanged}
            renderItem={({item, index}) => {
                return (
                    <ListItem
                        data={props.data}
                        index={index}
                        getOrderNum={() => {
                            return item.order_num;
                        }}
                        maxOrderNum={max_order_num}
                        sortData={() => {
                            initial_data.map((item, index) => {
                                if(item.order_num != data[index].order_num) {
                                    props.getSortedData(data);
                                    return;
                                }
                            });
                        }}
                        pressDelay={props.pressDelay}
                        blockLeftRightMove={props.blockLeftRightMove}
                        animationDuration={props.animationDuration}
                        useNativeDriver={props.useNativeDriver}
                        threshold={props.threshold}
                        setIsScrollEnabled={(flag) => {setIsScrollEnabled(flag)}}
                        ItemSeparatorComponent={() => {return props.ItemSeparatorComponent()}}
                        addMoveControl={(moveControl) => {
                            data[index].moveControl = moveControl;
                        }}
                        draggingActivated={() => {
                            if(props.draggingActivated) {
                                props.draggingActivated();
                            }
                        }}
                        draggingDeactivated={() => {
                            if(props.draggingDeactivated) {
                                props.draggingDeactivated();
                            }
                        }}
                        stylesWhenDragging={() => {
                            if(props.stylesWhenDragging) {
                                return props.stylesWhenDragging;
                            }
                            else {
                                return false;
                            }
                        }}
                        defaultStyles={() => {
                            if(props.defaultStyles) {
                                return props.defaultStyles;
                            }
                            else {
                                return false;
                            }
                        }}
                        dragEnabled={props.dragEnabled == true ? true : false}
                        changePosition={(moved_to, relocate_order_num) => {
                            if(relocate_order_num < 1 || relocate_order_num > max_order_num) {
                                console.log('out of bounds');
                                return;
                            }

                            //if next element is not in view, scroll down
                            /*if((max_view_index - 1) <= relocate_index 
                            && relocate_index < (max_order_num - 1)) {
                                let params = {index: (relocate_index + 2), viewOffset: 36, viewPosition: 1};
                                flat_list_ref.current.scrollToIndex(params);
                                max_view_index++;
                            }
                            else if ((min_view_index + 1) == relocate_index && relocate_index > 1) {
                                let params = {index: (relocate_index - 2), viewOffset: 36, viewPosition: 0};
                                flat_list_ref.current.scrollToIndex(params);
                                max_view_index--;
                            }*/
                            //find index of next/prev element
                            let relocate_index = '';
                            data.map((item, index) => {
                                if(item.order_num == relocate_order_num) {
                                    relocate_index = index;
                                    return;
                                }
                            })

                            if(moved_to == 'up') {
                                data[relocate_index].moveControl('down');
                            }
                            else if (moved_to == 'down') {
                                data[relocate_index].moveControl('up');
                            }

                            //reorder
                            if(moved_to == "up") {
                                data[index].order_num--;
                                data[relocate_index].order_num++;
                            }
                            else {
                                data[index].order_num++;
                                data[relocate_index].order_num--;
                            }
                        }}

                        //for swipe
                        addCloseSwipeLink={(closeSwipe) => {
                            data[index].closeSwipe = closeSwipe;
                        }}
                        closeOtherSwipes={(current_order_num) => {
                            closeSwipeList(data, current_order_num);
                        }}
                        onSwiped={() => {
                            if(props.onSwiped) {
                                props.onSwiped();
                            }
                            else {
                                return false;
                            }
                        }}
                        closeAllSwipes={props.closeAllSwipes ? props.closeAllSwipes : false}
                        swipeEnabled={props.swipeEnabled == true ? true : false}
                        rightThreshold={props.rightThreshold ? props.rightThreshold : 0}
                        leftThreshold={props.leftThreshold ? props.leftThreshold : 0}
                        overSwipeRight={props.overSwipeRight == true ? true : false}
                        overSwipeLeft={props.overSwipeLeft == true? true : false}
                        isContentOnRight={props.renderRightActions ? true : false}
                        renderRightActions={(offset_x) => {
                            if(props.renderRightActions) {
                                const rightAction = props.renderRightActions(item, index);
                                return rightAction(offset_x);
                            }
                            else {
                                return false;
                            }
                        }}
                        isContentOnLeft={props.renderLeftActions ? true : false}
                        renderLeftActions={(offset_x) => {
                            if(props.renderLeftActions) {
                                const leftAction = props.renderLeftActions(item, index);
                                return leftAction(offset_x);
                            }
                            else {
                                return false;
                            }
                        }}
                    >
                        {props.renderItem({item, index})}
                    </ListItem>
                );
            }}
            scrollEnabled={is_scroll_enabled}
            ItemSeparatorComponent={() => {return false}}
        />
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