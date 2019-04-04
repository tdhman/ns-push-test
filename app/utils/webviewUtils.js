import { isIOS } from 'tns-core-modules/platform'


let UIScrollViewDelegateDef;

if (isIOS) {
  UIScrollViewDelegateDef = NSObject.extend({
    viewForZoomingInScrollView(scrollView) {
      return null;
    },
    scrollViewWillBeginZoomingWithView(scrollView, view) {
      scrollView.pinchGestureRecognizer.enabled = false;
    }
  }, {
    name: "UIScrollViewDelegateImpl",
    protocols: [UIScrollViewDelegate] // implements the delegation protocol
  });
}

export const UIScrollViewDelegateImpl = UIScrollViewDelegateDef;