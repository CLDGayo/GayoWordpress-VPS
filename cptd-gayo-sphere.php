<?php
/**
 * Plugin Name: Gayo Sphere CPTs & Meta
 * Description: Registers all Gayo Sphere agency CPTs (gs_project, gs_service, gs_team_member, gs_testimonial, gs_insight, gs_partner, gs_case_study) with REST API support and meta fields.
 * Version: 1.0
 * Author: Clarence Lloyd Gayo
 */

// ─── CORS: allow gayo-sphere.cloud frontend ──────────────────────────────────
add_action( 'rest_api_init', function () {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = [ 'https://gayo-sphere.cloud', 'http://gayo-sphere.cloud' ];
    if ( in_array( $origin, $allowed, true ) || empty( $origin ) ) {
        header( 'Access-Control-Allow-Origin: *' );
        header( 'Access-Control-Allow-Methods: GET, OPTIONS' );
        header( 'Access-Control-Allow-Headers: Content-Type, Authorization' );
    }
}, 14 );

// ─── Register CPTs ────────────────────────────────────────────────────────────
add_action( 'init', function () {

    $shared = [
        'public'          => false,
        'show_ui'         => true,
        'show_in_rest'    => true,
        'capability_type' => 'post',
        'has_archive'     => false,
        'rewrite'         => false,
    ];

    // gs_project
    register_post_type( 'gs_project', array_merge( $shared, [
        'labels'      => [ 'name' => 'GS Projects', 'singular_name' => 'Project' ],
        'show_in_menu' => true,
        'menu_icon'   => 'dashicons-portfolio',
        'rest_base'   => 'gs-projects',
        'supports'    => [ 'title', 'editor', 'excerpt', 'thumbnail', 'custom-fields' ],
    ] ) );

    // gs_service
    register_post_type( 'gs_service', array_merge( $shared, [
        'labels'      => [ 'name' => 'GS Services', 'singular_name' => 'Service' ],
        'show_in_menu' => true,
        'menu_icon'   => 'dashicons-admin-tools',
        'rest_base'   => 'gs-services',
        'supports'    => [ 'title', 'editor', 'custom-fields' ],
    ] ) );

    // gs_team_member
    register_post_type( 'gs_team_member', array_merge( $shared, [
        'labels'      => [ 'name' => 'GS Team', 'singular_name' => 'Team Member' ],
        'show_in_menu' => true,
        'menu_icon'   => 'dashicons-groups',
        'rest_base'   => 'gs-team',
        'supports'    => [ 'title', 'editor', 'thumbnail', 'custom-fields' ],
    ] ) );

    // gs_testimonial
    register_post_type( 'gs_testimonial', array_merge( $shared, [
        'labels'      => [ 'name' => 'GS Testimonials', 'singular_name' => 'Testimonial' ],
        'show_in_menu' => true,
        'menu_icon'   => 'dashicons-format-quote',
        'rest_base'   => 'gs-testimonials',
        'supports'    => [ 'title', 'editor', 'custom-fields' ],
    ] ) );

    // gs_insight
    register_post_type( 'gs_insight', array_merge( $shared, [
        'labels'      => [ 'name' => 'GS Insights', 'singular_name' => 'Insight' ],
        'show_in_menu' => true,
        'menu_icon'   => 'dashicons-lightbulb',
        'rest_base'   => 'gs-insights',
        'supports'    => [ 'title', 'editor', 'excerpt', 'thumbnail', 'custom-fields' ],
    ] ) );

    // gs_partner
    register_post_type( 'gs_partner', array_merge( $shared, [
        'labels'      => [ 'name' => 'GS Partners', 'singular_name' => 'Partner' ],
        'show_in_menu' => true,
        'menu_icon'   => 'dashicons-building',
        'rest_base'   => 'gs-partners',
        'supports'    => [ 'title', 'thumbnail', 'custom-fields' ],
    ] ) );

    // gs_case_study
    register_post_type( 'gs_case_study', array_merge( $shared, [
        'labels'      => [ 'name' => 'GS Case Studies', 'singular_name' => 'Case Study' ],
        'show_in_menu' => true,
        'menu_icon'   => 'dashicons-analytics',
        'rest_base'   => 'gs-case-studies',
        'supports'    => [ 'title', 'editor', 'excerpt', 'thumbnail', 'custom-fields' ],
    ] ) );

} );

// ─── Register Meta Fields ─────────────────────────────────────────────────────
add_action( 'init', function () {
    $s  = [ 'type' => 'string',  'single' => true, 'show_in_rest' => true ];
    $b  = [ 'type' => 'boolean', 'single' => true, 'show_in_rest' => true ];
    $n  = [ 'type' => 'integer', 'single' => true, 'show_in_rest' => true ];

    // gs_project
    foreach ( [ 'gs_project_client', 'gs_project_category', 'gs_project_tools',
                'gs_project_thumbnail', 'gs_project_impact', 'gs_project_color' ] as $key ) {
        register_post_meta( 'gs_project', $key, $s );
    }
    register_post_meta( 'gs_project', 'gs_project_featured',   $b );
    register_post_meta( 'gs_project', 'gs_project_sort_order', $n );

    // gs_service
    foreach ( [ 'gs_service_tagline', 'gs_service_icon', 'gs_service_features',
                'gs_service_deliverables', 'gs_service_color' ] as $key ) {
        register_post_meta( 'gs_service', $key, $s );
    }
    register_post_meta( 'gs_service', 'gs_service_sort_order', $n );

    // gs_team_member
    foreach ( [ 'gs_team_role', 'gs_team_short_bio', 'gs_team_photo',
                'gs_team_photo_nobg', 'gs_team_location', 'gs_team_tools',
                'gs_team_linkedin', 'gs_team_stat_1_label', 'gs_team_stat_1_value',
                'gs_team_stat_2_label', 'gs_team_stat_2_value',
                'gs_team_stat_3_label', 'gs_team_stat_3_value',
                'gs_team_specialty_color' ] as $key ) {
        register_post_meta( 'gs_team_member', $key, $s );
    }
    register_post_meta( 'gs_team_member', 'gs_team_sort_order', $n );

    // gs_testimonial
    foreach ( [ 'gs_testimonial_quote', 'gs_testimonial_author_name',
                'gs_testimonial_author_title', 'gs_testimonial_author_company',
                'gs_testimonial_author_photo' ] as $key ) {
        register_post_meta( 'gs_testimonial', $key, $s );
    }
    register_post_meta( 'gs_testimonial', 'gs_testimonial_featured', $b );
    register_post_meta( 'gs_testimonial', 'gs_testimonial_sort_order', $n );

    // gs_insight
    foreach ( [ 'gs_insight_cover_image', 'gs_insight_category',
                'gs_insight_author_name', 'gs_insight_tags' ] as $key ) {
        register_post_meta( 'gs_insight', $key, $s );
    }
    register_post_meta( 'gs_insight', 'gs_insight_featured',  $b );
    register_post_meta( 'gs_insight', 'gs_insight_read_time', $n );

    // gs_partner
    foreach ( [ 'gs_partner_logo', 'gs_partner_url' ] as $key ) {
        register_post_meta( 'gs_partner', $key, $s );
    }
    register_post_meta( 'gs_partner', 'gs_partner_sort_order', $n );

    // gs_case_study
    foreach ( [ 'gs_case_client', 'gs_case_problem', 'gs_case_solution',
                'gs_case_result', 'gs_case_cover_image', 'gs_case_service_type',
                'gs_case_stat_1_label', 'gs_case_stat_1_value',
                'gs_case_stat_2_label', 'gs_case_stat_2_value',
                'gs_case_stat_3_label', 'gs_case_stat_3_value' ] as $key ) {
        register_post_meta( 'gs_case_study', $key, $s );
    }
    register_post_meta( 'gs_case_study', 'gs_case_featured', $b );
    register_post_meta( 'gs_case_study', 'gs_case_sort_order', $n );
} );
