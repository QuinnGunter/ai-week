//
//  NSView+Extensions.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 21/10/2022.
//

import AppKit

extension NSView {
	public enum ConstraintMode {
		case center
		case fill
		case promise
	}

	@discardableResult private func addConstraintsForConstraintMode(_ mode: ConstraintMode, toView view: NSView) -> [NSLayoutConstraint] {
		var constraints: [NSLayoutConstraint] = []
		switch mode {
		case .center:
			constraints = [
				view.centerXAnchor.constraint(equalTo: centerXAnchor),
				view.centerYAnchor.constraint(equalTo: centerYAnchor),
			]
		case .fill:
			constraints = [
				view.topAnchor.constraint(equalTo: topAnchor),
				view.bottomAnchor.constraint(equalTo: bottomAnchor),
				view.leftAnchor.constraint(equalTo: leftAnchor),
				view.rightAnchor.constraint(equalTo: rightAnchor),
			]
		case .promise:
			// Constraints will be added later
			break
		}
		NSLayoutConstraint.activate(constraints)
		return constraints
	}

	@discardableResult public func addSubview(_ view: NSView, constraintMode: ConstraintMode) -> [NSLayoutConstraint] {
		addSubview(view)
		view.translatesAutoresizingMaskIntoConstraints = false

		return addConstraintsForConstraintMode(constraintMode, toView: view)
	}

	public func addSubview(_ view: NSView,
						   positioned place: NSWindow.OrderingMode,
						   relativeTo otherView: NSView?,
						   constraintMode: ConstraintMode) {
		addSubview(view, positioned: place, relativeTo: otherView)
		view.translatesAutoresizingMaskIntoConstraints = false

		addConstraintsForConstraintMode(constraintMode, toView: view)
	}

	public func addSubview(_ subview: NSView, insets: NSEdgeInsets) {
		addSubview(subview)
		subview.translatesAutoresizingMaskIntoConstraints = false

		subview.leftAnchor.constraint(equalTo: leftAnchor, constant: insets.left).isActive = true
		subview.topAnchor.constraint(equalTo: topAnchor, constant: insets.top).isActive = true
		subview.rightAnchor.constraint(equalTo: rightAnchor, constant: -insets.right).isActive = true
		subview.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -insets.bottom).isActive = true
	}

	public func containerizedWithEdgeInsets(_ edgeInsets: NSEdgeInsets) -> NSView {
		let frame: CGRect = self.frame
		let containerFrame = CGRect(x: frame.origin.x,
									y: frame.origin.y,
									width: edgeInsets.left + frame.width + edgeInsets.right,
									height: edgeInsets.top + frame.height + edgeInsets.bottom)
		let containerView = NSView(frame: containerFrame)
		containerView.addSubview(self, insets: edgeInsets)
		return containerView
	}
}

extension NSView {
	/// A loading view added as a new subview.
	public func addLoadingSubview() -> NSView {
		let loadingView = NSView.generateLoadingView(frame: bounds)
		loadingView.autoresizingMask = [.width, .height]
		addSubview(loadingView)
		return loadingView
	}

	public func firstSubviewOfClass(withName className: String) -> NSView? {
		// Don't return descendants before we've looked through all of our direct subviews
		// This means we loop through subviews twice
		for subview: NSView in subviews where subview.className == className {
			return subview
		}

		for subview: NSView in subviews {
			if let matchingDescendent: NSView = subview.firstSubviewOfClass(withName: className) {
				return matchingDescendent
			}
		}

		return nil
	}
}

extension NSView {
	private class func generateLoadingView(frame: NSRect) -> NSView {
		let box = NSBox(frame: frame)
		box.boxType = .custom
		box.titlePosition = .noTitle
		box.borderWidth = 0
		box.borderColor = .clear
		box.fillColor = .windowBackgroundColor

		let progressIndicator = NSProgressIndicator()
		progressIndicator.style = .spinning
		progressIndicator.controlSize = .regular
		box.addSubview(progressIndicator, constraintMode: .center)
		progressIndicator.startAnimation(nil)

		return box
	}
}
