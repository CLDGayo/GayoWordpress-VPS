<?php
/**
 * Plugin Name: Gayo Sphere Global API
 * Description: Exposes gs/v1/settings REST endpoint for site-wide settings (hero, stats, contact, social). Editable via Settings > Gayo Sphere Settings.
 * Version: 1.0
 * Author: Clarence Lloyd Gayo
 */

// ─── Admin Settings Page ──────────────────────────────────────────────────────
add_action( 'admin_menu', function () {
    add_options_page(
        'Gayo Sphere Settings',
        'Gayo Sphere',
        'manage_options',
        'gs-settings',
        'gs_render_settings_page'
    );
} );

function gs_render_settings_page() {
    if ( isset( $_POST['gs_save'] ) && check_admin_referer( 'gs_settings_save' ) ) {
        $keys = [ 'gs_hero', 'gs_stats', 'gs_contact', 'gs_home_sections', 'gs_services_page', 'gs_team_page', 'gs_contact_page' ];
        foreach ( $keys as $k ) {
            if ( isset( $_POST[ $k ] ) ) {
                update_option( $k, wp_unslash( $_POST[ $k ] ) );
            }
        }
        echo '<div class="updated"><p>Settings saved.</p></div>';
    }

    $hero     = get_option( 'gs_hero',          '' );
    $stats    = get_option( 'gs_stats',         '' );
    $contact  = get_option( 'gs_contact',       '' );
    $sections = get_option( 'gs_home_sections', '' );
    ?>
    <div class="wrap">
        <h1>Gayo Sphere Site Settings</h1>
        <p>Edit the JSON below to update site-wide content. Fields update live on <strong>gayo-sphere.cloud</strong>.</p>
        <form method="post">
            <?php wp_nonce_field( 'gs_settings_save' ); ?>

            <h2>Hero Section</h2>
            <p><em>Controls the homepage hero headline, sub-text, and CTAs.</em></p>
            <textarea name="gs_hero" rows="12" class="large-text code"><?php echo esc_textarea( $hero ?: json_encode( [
                'headline'           => 'Building intelligent automation systems with precision',
                'sub'                => 'We help entrepreneurs and businesses eliminate manual chaos through AI-powered automation, CRM systems, and e-commerce management.',
                'cta_primary_label'  => "Let's connect",
                'cta_primary_href'   => 'contact-us.html',
                'cta_secondary_label'=> 'Check our work',
                'cta_secondary_href' => 'work.html',
                'eyebrow'            => 'AI & Automation Agency · Tokyo, Japan',
            ], JSON_PRETTY_PRINT ) ); ?></textarea>

            <h2>Stats</h2>
            <p><em>Controls the dark stats strip on the home page.</em></p>
            <textarea name="gs_stats" rows="12" class="large-text code"><?php echo esc_textarea( $stats ?: json_encode( [
                [ 'value' => '50+',  'label' => 'Projects Delivered' ],
                [ 'value' => '9',    'label' => 'Systems Built' ],
                [ 'value' => '2',    'label' => 'Specialists' ],
                [ 'value' => '3+',   'label' => 'Years in Business' ],
            ], JSON_PRETTY_PRINT ) ); ?></textarea>

            <h2>Contact &amp; Social</h2>
            <textarea name="gs_contact" rows="12" class="large-text code"><?php echo esc_textarea( $contact ?: json_encode( [
                'email'    => 'clarence.gayo@gmail.com',
                'phone'    => '(+81) 070-8986-1692',
                'location' => 'Tokyo, Japan',
                'linkedin' => 'https://linkedin.com/in/cldgayo/',
                'github'   => 'https://github.com/Gayo321',
            ], JSON_PRETTY_PRINT ) ); ?></textarea>

            <h2>Home Sections Copy</h2>
            <textarea name="gs_home_sections" rows="8" class="large-text code"><?php echo esc_textarea( $sections ?: json_encode( [
                'projects_heading'    => 'Our latest automation projects.',
                'partners_heading'    => 'Some of our partners and clients',
                'testimonials_heading'=> 'What our clients say',
                'about_text'          => 'As a full-service AI automation agency, we work closely with our clients to build transformative automation systems across all platforms and business touchpoints.',
                'cta_heading'         => "Interested to collaborate? Let's connect.",
            ], JSON_PRETTY_PRINT ) ); ?></textarea>

            <p><input type="submit" name="gs_save" class="button button-primary" value="Save Settings"></p>
        </form>
    </div>
    <?php
}

// ─── REST Endpoint: gs/v1/settings ───────────────────────────────────────────
add_action( 'rest_api_init', function () {
    register_rest_route( 'gs/v1', '/settings', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => function () {
            $hero     = json_decode( get_option( 'gs_hero',          '{}' ), true ) ?: [];
            $stats    = json_decode( get_option( 'gs_stats',         '[]' ), true ) ?: [];
            $contact  = json_decode( get_option( 'gs_contact',       '{}' ), true ) ?: [];
            $sections = json_decode( get_option( 'gs_home_sections', '{}' ), true ) ?: [];

            $hero = wp_parse_args( $hero, [
                'headline'            => 'Building intelligent automation systems with precision',
                'sub'                 => 'We help entrepreneurs and businesses eliminate manual chaos through AI-powered automation, CRM systems, and e-commerce management.',
                'cta_primary_label'   => "Let's connect",
                'cta_primary_href'    => 'contact-us.html',
                'cta_secondary_label' => 'Check our work',
                'cta_secondary_href'  => 'work.html',
                'eyebrow'             => 'AI & Automation Agency · Tokyo, Japan',
            ] );

            if ( empty( $stats ) ) {
                $stats = [
                    [ 'value' => '50+', 'label' => 'Projects Delivered' ],
                    [ 'value' => '9',   'label' => 'Systems Built' ],
                    [ 'value' => '2',   'label' => 'Specialists' ],
                    [ 'value' => '3+',  'label' => 'Years in Business' ],
                ];
            }

            $contact = wp_parse_args( $contact, [
                'email'    => 'clarence.gayo@gmail.com',
                'phone'    => '(+81) 070-8986-1692',
                'location' => 'Tokyo, Japan',
                'linkedin' => 'https://linkedin.com/in/cldgayo/',
                'github'   => 'https://github.com/Gayo321',
            ] );

            $sections = wp_parse_args( $sections, [
                'projects_heading'     => 'Our latest automation projects.',
                'partners_heading'     => 'Some of our partners and clients',
                'testimonials_heading' => 'What our clients say',
                'about_text'           => 'As a full-service AI automation agency, we work closely with our clients to build transformative automation systems across all platforms and business touchpoints.',
                'cta_heading'          => "Interested to collaborate? Let's connect.",
            ] );

            return rest_ensure_response( [
                'hero'     => $hero,
                'stats'    => $stats,
                'contact'  => $contact,
                'sections' => $sections,
            ] );
        },
    ] );
} );
